// Copyright 2016-2017, University of Colorado Boulder

/**
 * This code governs the movement of charges, making sure they are distributed equally among the different
 * CircuitElements.  This exists for the life of the sim and hence does not need a dispose implementation.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( require => {
  'use strict';

  // modules
  const CCKCConstants = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/CCKCConstants' );
  const circuitConstructionKitCommon = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/circuitConstructionKitCommon' );
  const NumberProperty = require( 'AXON/NumberProperty' );
  const Range = require( 'DOT/Range' );
  const RunningAverage = require( 'DOT/RunningAverage' );
  const Util = require( 'DOT/Util' );

  // constants

  // If the current is lower than this, then there is no charge movement
  const MINIMUM_CURRENT = 1E-10;

  // The furthest an charge can step in one frame before the time scale must be reduced (to prevent a strobe effect)
  const MAX_POSITION_CHANGE = CCKCConstants.CHARGE_SEPARATION * 0.43;

  // Number of times to spread out charges so they don't get bunched up.
  const NUMBER_OF_EQUALIZE_STEPS = 2;

  // Factor that multiplies the current to attain speed in screen coordinates per second
  // No longer manually tuned so that at 1 Amp, 1 charge flows past in 1 second
  const SPEED_SCALE = 25;

  // the highest allowable time step for integration
  const MAX_DT = 1 / 30;

  /**
   * Gets the absolute value of the current in a circuit element.
   * @param {CircuitElement} circuitElement
   * @returns {number}
   * @constructor
   */
  const CURRENT_MAGNITUDE = function( circuitElement ) {
    return Math.abs( circuitElement.currentProperty.get() );
  };

  class ChargeAnimator {

    /**
     * @param {Circuit} circuit
     * @constructor
     */
    constructor( circuit ) {

      // @private (read-only) {ObservableArray.<Charge>} - the ObservableArray of Charge instances
      this.charges = circuit.charges;

      // @private (read-only) {Circuit} - the Circuit
      this.circuit = circuit;

      // @private (read-only) {number} - factor that reduces the overall propagator speed when maximum speed is exceeded
      this.scale = 1;

      // @public {RunningAverage} - a running average over last time steps as a smoothing step
      this.timeScaleRunningAverage = new RunningAverage( 30 );

      // @public (read-only) {NumberProperty} - how much the time should be slowed, 1 is full speed, 0.5 is running at
      // half speed, etc.
      this.timeScaleProperty = new NumberProperty( 1, { range: new Range( 0, 1 ) } );
    }

    /**
     * Restores to the initial state
     * @public
     */
    reset() {
      this.timeScaleProperty.reset();
      this.timeScaleRunningAverage.clear();
    }

    /**
     * Update the location of the charges based on the circuit currents
     * @param {number} dt - elapsed time in seconds
     * @public
     */
    step( dt ) {

      if ( this.charges.length === 0 || this.circuit.circuitElements.length === 0 ) {
        return;
      }

      // dt would ideally be around 16.666ms = 0.0166 sec.  Cap it to avoid too large of an integration step.
      dt = Math.min( dt, MAX_DT );

      // Find the fastest current in any circuit element
      const maxCurrentMagnitude = CURRENT_MAGNITUDE( _.maxBy( this.circuit.circuitElements.getArray(), CURRENT_MAGNITUDE ) );
      assert && assert( maxCurrentMagnitude >= 0, 'max current should be positive' );

      const maxSpeed = maxCurrentMagnitude * SPEED_SCALE;
      const maxPositionChange = maxSpeed * MAX_DT; // Use the max dt instead of the true dt to avoid fluctuations

      // Slow down the simulation if the fastest step distance exceeds the maximum allowed step
      this.scale = ( maxPositionChange >= MAX_POSITION_CHANGE ) ? ( MAX_POSITION_CHANGE / maxPositionChange ) : 1;

      // Average over scale values to smooth them out
      const averageScale = Util.clamp( this.timeScaleRunningAverage.updateRunningAverage( this.scale ), 0, 1 );
      this.timeScaleProperty.set( averageScale );

      for ( let i = 0; i < this.charges.length; i++ ) {
        const charge = this.charges.get( i );

        // Don't update charges in chargeLayoutDirty circuit elements, because they will get a relayout anyways
        if ( !charge.circuitElement.chargeLayoutDirty ) {
          this.propagate( charge, dt );
        }
      }

      // Spread out the charges so they don't bunch up
      for ( let i = 0; i < NUMBER_OF_EQUALIZE_STEPS; i++ ) {
        this.equalizeAll( dt );
      }

      // After computing the new charge positions (possibly across several deltas), trigger the views to update.
      this.charges.forEach( charge => charge.updatePositionAndAngle() );
    }

    /**
     * Make the charges repel each other so they don't bunch up.
     * @param {number} dt - the elapsed time in seconds
     * @private
     */
    equalizeAll( dt ) {

      // Update them in a stochastic order to avoid systematic sources of error building up.
      const indices = phet.joist.random.shuffle( _.range( this.charges.length ) );
      for ( let i = 0; i < this.charges.length; i++ ) {
        const charge = this.charges.get( indices[ i ] );

        // No need to update charges in chargeLayoutDirty circuit elements, they will be replaced anyways.  Skipping
        // chargeLayoutDirty circuitElements improves performance.  Also, only update electrons in circuit elements
        // that have a current (to improve performance)
        if ( !charge.circuitElement.chargeLayoutDirty && Math.abs( charge.circuitElement.currentProperty.get() ) >= MINIMUM_CURRENT ) {
          this.equalizeCharge( charge, dt );
        }
      }
    }

    /**
     * Adjust the charge so it is more closely centered between its neighbors.  This prevents charges from getting
     * too bunched up.
     * @param {Charge} charge - the charge to adjust
     * @param {number} dt - seconds
     * @private
     */
    equalizeCharge( charge, dt ) {

      const circuitElementCharges = this.circuit.getChargesInCircuitElement( charge.circuitElement );

      // if it has a lower and upper neighbor, nudge the charge to be closer to the midpoint
      const sorted = _.sortBy( circuitElementCharges, 'distance' );

      const chargeIndex = sorted.indexOf( charge );
      const upper = sorted[ chargeIndex + 1 ];
      const lower = sorted[ chargeIndex - 1 ];

      // Only adjust a charge if it is between two other charges
      if ( upper && lower ) {
        const neighborSeparation = upper.distance - lower.distance;
        const currentPosition = charge.distance;

        let desiredPosition = lower.distance + neighborSeparation / 2;
        const distanceFromDesiredPosition = Math.abs( desiredPosition - currentPosition );
        const sameDirectionAsCurrent = Util.sign( desiredPosition - currentPosition ) ===
                                       Util.sign( charge.circuitElement.currentProperty.get() * charge.charge );

        // never slow down or run the current backwards
        if ( sameDirectionAsCurrent ) {

          // When we need to correct in the same direction as current flow, do it quickly.
          const correctionStepSize = Math.abs( 5.5 / NUMBER_OF_EQUALIZE_STEPS * SPEED_SCALE * dt );

          // If far enough away that it won't overshoot, then correct it with one step
          if ( distanceFromDesiredPosition > correctionStepSize ) {

            // move in the appropriate direction maxDX
            if ( desiredPosition < currentPosition ) {
              desiredPosition = currentPosition - correctionStepSize;
            }
            else if ( desiredPosition > currentPosition ) {
              desiredPosition = currentPosition + correctionStepSize;
            }
          }

          // Only update the charge if its new position would be within the same circuit element.
          if ( desiredPosition >= 0 && desiredPosition <= charge.circuitElement.chargePathLength ) {
            charge.distance = desiredPosition;
          }
        }
      }
    }

    /**
     * Move the charge forward in time by the specified amount.
     * @param {Charge} charge - the charge to update
     * @param {number} dt - elapsed time in seconds
     * @private
     */
    propagate( charge, dt ) {
      const chargePosition = charge.distance;
      assert && assert( _.isNumber( chargePosition ), 'distance along wire should be a number' );
      const current = charge.circuitElement.currentProperty.get() * charge.charge;

      // Below min current, the charges should remain stationary
      if ( Math.abs( current ) > MINIMUM_CURRENT ) {
        const speed = current * SPEED_SCALE;
        const chargePositionDelta = speed * dt * this.scale;
        const newChargePosition = chargePosition + chargePositionDelta;

        // Step within a single circuit element
        if ( charge.circuitElement.containsScalarLocation( newChargePosition ) ) {
          charge.distance = newChargePosition;
        }
        else {

          // move to a new CircuitElement
          const overshoot = current < 0 ?
                            -newChargePosition :
                            ( newChargePosition - charge.circuitElement.chargePathLength );
          const lessThanBeginningOfOldCircuitElement = newChargePosition < 0;

          assert && assert( !isNaN( overshoot ), 'overshoot should be a number' );
          assert && assert( overshoot >= 0, 'overshoot should be >=0' );

          // enumerate all possible circuit elements the charge could go to
          const vertex = lessThanBeginningOfOldCircuitElement ?
                         charge.circuitElement.startVertexProperty.get() :
                         charge.circuitElement.endVertexProperty.get();
          const circuitLocations = this.getLocations( charge, overshoot, vertex, 0 );
          if ( circuitLocations.length > 0 ) {

            // choose the CircuitElement with the furthest away electron
            const chosenCircuitLocation = _.maxBy( circuitLocations, 'distanceToClosestElectron' );
            assert && assert( chosenCircuitLocation.distanceToClosestElectron >= 0, 'distanceToClosestElectron should be >=0' );
            charge.circuitElement = chosenCircuitLocation.circuitElement;
            charge.distance = chosenCircuitLocation.distance;
          }
        }
      }
    }

    /**
     * Returns the locations where a charge can flow to (connected circuits with current flowing in the right direction)
     * @param {Charge} charge - the charge that is moving
     * @param {number} overshoot - the distance the charge should appear along the next circuit element
     * @param {Vertex} vertex - vertex the charge is passing by
     * @param {number} depth - number of recursive calls
     * @returns {Object[]} see createCircuitLocation
     * @private
     */
    getLocations( charge, overshoot, vertex, depth ) {

      const circuit = this.circuit;

      const adjacentCircuitElements = this.circuit.getNeighborCircuitElements( vertex );
      const circuitLocations = [];

      // Keep only those with outgoing current.
      for ( let i = 0; i < adjacentCircuitElements.length; i++ ) {
        const circuitElement = adjacentCircuitElements[ i ];
        const current = circuitElement.currentProperty.get() * charge.charge;
        let distance = null;

        // The linear algebra solver can result in currents of 1E-12 where it should be zero.  For these cases, don't
        // permit charges to flow. The current is clamped here instead of after the linear algebra so that we don't
        // mess up support for oscillating elements that may need the small values such as capacitors and inductors.
        let found = false;
        if ( current > MINIMUM_CURRENT && circuitElement.startVertexProperty.get() === vertex ) {

          // Start near the beginning.
          distance = Util.clamp( overshoot, 0, circuitElement.chargePathLength ); // Note, this can be zero
          found = true;
        }
        else if ( current < -MINIMUM_CURRENT && circuitElement.endVertexProperty.get() === vertex ) {

          // start near the end
          distance = Util.clamp( circuitElement.chargePathLength - overshoot, 0, circuitElement.chargePathLength ); // can be zero
          found = true;
        }
        else {

          // Current too small to animate
        }

        if ( found ) {
          const charges = circuit.getChargesInCircuitElement( circuitElement );
          assert && assert(
            circuitElement.startVertexProperty.get() === vertex ||
            circuitElement.endVertexProperty.get() === vertex
          );
          const atStartOfNewCircuitElement = circuitElement.startVertexProperty.get() === vertex;
          let distanceToClosestElectron = 0;
          if ( charges.length > 0 ) {

            // find closest electron to the vertex
            if ( atStartOfNewCircuitElement ) {
              distanceToClosestElectron = _.minBy( charges, 'distance' ).distance;
            }
            else {
              distanceToClosestElectron = circuitElement.chargePathLength - _.maxBy( charges, 'distance' ).distance;
            }

            circuitLocations.push( {
              circuitElement: circuitElement,
              distance: distance,
              distanceToClosestElectron: distanceToClosestElectron
            } );
          }
          else if ( depth < 20 ) {

            // check downstream circuit elements, but only if we haven't recursed too far (just in case)
            const locations = this.getLocations( charge, 0, circuitElement.getOppositeVertex( vertex ), depth + 1 );

            if ( locations.length > 0 ) {

              // find the one with the closest electron
              const nearest = _.minBy( locations, 'distanceToClosestElectron' );

              circuitLocations.push( {
                circuitElement: circuitElement,
                distance: distance,
                distanceToClosestElectron: nearest.distanceToClosestElectron + circuitElement.chargePathLength
              } );
            }
          }
        }
      }
      return circuitLocations;
    }
  }

  return circuitConstructionKitCommon.register( 'ChargeAnimator', ChargeAnimator );
} );