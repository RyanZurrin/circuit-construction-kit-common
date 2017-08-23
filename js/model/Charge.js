// Copyright 2016-2017, University of Colorado Boulder

/**
 * The model for a single blue charge that moves along a circuit element, depicted as a colored sphere.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var BooleanProperty = require( 'AXON/BooleanProperty' );
  var Emitter = require( 'AXON/Emitter' );
  var NumberProperty = require( 'AXON/NumberProperty' );
  var Property = require( 'AXON/Property' );
  var circuitConstructionKitCommon = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/circuitConstructionKitCommon' );
  var Vector2 = require( 'DOT/Vector2' );
  var inherit = require( 'PHET_CORE/inherit' );

  /**
   * @param {CircuitElement} circuitElement - the circuit element the charge is in.
   * @param {number} distance - how far along the circuit element it has traveled (in screen coordinates)
   * @param {Property.<boolean>} visibleProperty - whether the charge should be shown.
   * @param {number} charge - +1 for conventional current and -1 for electrons
   * @constructor
   */
  function Charge( circuitElement, distance, visibleProperty, charge ) {

    assert && assert( charge === 1 || charge === -1, 'charge should be 1 or -1' );

    // @public (read-only) {number} the amount of charge
    this.charge = charge;

    // Validate inputs
    assert && assert( _.isNumber( distance ), 'distance should be a number' );
    assert && assert( distance >= 0, 'charge was below the origin of the circuit element' );
    assert && assert( circuitElement.containsScalarLocation( distance ), 'charge was not within the circuit element' );

    var self = this;

    // @public (read-only) {CircuitElement} - the CircuitElement the Charge is in, changed by Charge.setLocation
    this.circuitElement = circuitElement;

    // @public (read-only) {NumberProperty} - the distance the charge has traveled in its CircuitElement in view
    // coordinates
    this.distanceProperty = new NumberProperty( distance );

    // @public {BooleanProperty} - To improve performance, disable updating while the position of the charge is changed
    // many times during the update step.
    //REVIEW: Presumably this can be removed, see note below for the multilink on proposed strategy
    //REVIEW(samreid): Even if we use a single matrix instead of separate position/angle attributes, there are several
    //REVIEW(samreid): updates during each step, and I suspect it would still be good to batch them instead of letting
    //REVIEW(samreid): intermediate values update the view.
    this.updatingPositionProperty = new BooleanProperty( true );

    // @public (read-only) {Property.<Vector2>} - the 2d position of the charge
    this.positionProperty = new Property( Vector2.ZERO );

    //REVIEW*: It may be worse for memory (but better for simplicity/performance), but instead of an independent
    //REVIEW: position/angle, it would be possible to have a matrixProperty that includes both. It looks like ChargeNode
    //REVIEW: has to fully update its transform multiple times upon any change, as the position/angle changes both
    //REVIEW: trigger a full updateTransform in ChargeNode.
    // @public (read-only) {NumberProperty} - the angle of the charge (for showing arrows)
    this.angleProperty = new NumberProperty( 0 );

    // When the distance or updating properties change, update the 2d position of the charge
    //REVIEW*: A multilink seems like overkill here, particularly since it's conditional. Furthermore, this looks like
    //REVIEW: a function that should be a method (for performance and memory). Can we have an update() function or
    //REVIEW: equivalent, and call it either when setLocation() is called or from ChargeAnimator's location where
    //REVIEW: charges can then be updated? This should reduce calls to it, be a bit simpler, and have lower memory.
    this.chargeMultilink = Property.multilink( [ this.distanceProperty, this.updatingPositionProperty ],
      function( distance, updating ) {
        if ( updating ) {
          assert && assert( !isNaN( distance ), 'charge position was not a number' );
          var positionAndAngle = self.circuitElement.getPositionAndAngle( distance );
          var position = positionAndAngle.position;
          assert && assert( !isNaN( position.x ) && !isNaN( position.y ), 'point was not a number' );
          self.angleProperty.set( positionAndAngle.angle );
          self.positionProperty.set( position );

          //REVIEW*: Can the non-assertion parts of the function can just be:
          //REVIEW: self.matrixProperty.set( self.circuitElement.getMatrix( distance ) );
        }
      } );

    // @public (read-only) {Property.<boolean>} - whether the charge should be displayed
    this.visibleProperty = visibleProperty;

    // @public (read-only) {Emitter} send notifications when the charge is disposed, so the view can be disposed.
    this.disposeEmitter = new Emitter();
  }

  circuitConstructionKitCommon.register( 'Charge', Charge );

  return inherit( Object, Charge, {

    /**
     * Dispose the charge when it will never be used again.
     * @public
     */
    dispose: function() {
      this.chargeMultilink.dispose();
      this.disposeEmitter.emit();
      this.disposeEmitter.removeAllListeners();
    },

    /**
     * Set the Charge to be in a new place in the circuit.
     * @param {CircuitElement} circuitElement - the new CircuitElement the charge will be in.
     * @param {number} distance - the position within the new CircuitElement
     * @public
     */
    setLocation: function( circuitElement, distance ) {
      assert && assert( isFinite( distance ), 'Distance was not finite' ); // also guards against NaN
      assert && assert( circuitElement.containsScalarLocation( distance ), 'no location in branch' );
      this.circuitElement = circuitElement;
      this.distanceProperty.set( distance );
    }
  } );
} );