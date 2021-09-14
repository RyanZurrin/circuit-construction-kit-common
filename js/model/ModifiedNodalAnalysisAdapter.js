// Copyright 2019-2021, University of Colorado Boulder

/**
 * Takes a Circuit, creates a corresponding DynamicCircuit, solves the DynamicCircuit and applies the results back
 * to the original Circuit.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import CCKCConstants from '../CCKCConstants.js';
import CCKCQueryParameters from '../CCKCQueryParameters.js';
import CCKCUtils from '../CCKCUtils.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import Capacitor from './Capacitor.js';
import DynamicCircuit from './DynamicCircuit.js';
import Fuse from './Fuse.js';
import Inductor from './Inductor.js';
import LightBulb from './LightBulb.js';
import ModifiedNodalAnalysisCircuitElement from './ModifiedNodalAnalysisCircuitElement.js';
import Resistor from './Resistor.js';
import SeriesAmmeter from './SeriesAmmeter.js';
import Switch from './Switch.js';
import TimestepSubdivisions from './TimestepSubdivisions.js';
import VoltageSource from './VoltageSource.js';
import Wire from './Wire.js';

// constants
const TIMESTEP_SUBDIVISIONS = new TimestepSubdivisions();

class ResistiveBatteryAdapter extends DynamicCircuit.ResistiveBattery {

  /**
   * @param {Circuit} circuit - the primary Circuit model instance, so we can look up Vertex indices
   * @param {Battery} battery
   */
  constructor( circuit, battery ) {
    super(
      circuit.vertexGroup.indexOf( battery.startVertexProperty.value ),
      circuit.vertexGroup.indexOf( battery.endVertexProperty.value ),
      battery.voltageProperty.value,
      battery.internalResistanceProperty.value
    );

    // @public (read-only)
    this.battery = battery;
  }

  /**
   * @param {CircuitResult} circuitResult
   * @public
   */
  applySolution( circuitResult ) {
    this.battery.currentProperty.value = circuitResult.getTimeAverageCurrent( this );
  }
}

class ResistorAdapter extends ModifiedNodalAnalysisCircuitElement {

  /**
   * @param {Circuit} circuit
   * @param {Resistor} resistor
   */
  constructor( circuit, resistor ) {
    super(
      circuit.vertexGroup.indexOf( resistor.startVertexProperty.value ),
      circuit.vertexGroup.indexOf( resistor.endVertexProperty.value ),
      resistor,

      // If a resistor goes to 0 resistance, then we cannot compute the current through as I=V/R.  Therefore,
      // simulate a small amount of resistance.
      resistor.resistanceProperty.value || CCKCConstants.MINIMUM_RESISTANCE
    );

    // @private
    this.resistor = resistor;
  }

  /**
   * @param {CircuitResult} circuitResult
   * @public
   */
  applySolution( circuitResult ) {
    this.resistor.currentProperty.value = circuitResult.getTimeAverageCurrent( this );
  }
}

class CapacitorAdapter extends DynamicCircuit.DynamicCapacitor {

  /**
   * @param {Circuit} circuit
   * @param {Capacitor} capacitor
   */
  constructor( circuit, capacitor ) {

    const dynamicCircuitCapacitor = new DynamicCircuit.Capacitor(
      circuit.vertexGroup.indexOf( capacitor.startVertexProperty.value ),
      circuit.vertexGroup.indexOf( capacitor.endVertexProperty.value ),
      capacitor.capacitanceProperty.value
    );
    super( dynamicCircuitCapacitor, new DynamicCircuit.DynamicElementState( capacitor.mnaVoltageDrop, capacitor.mnaCurrent ) );

    // @private - alongside this.dynamicCircuitCapacitor assigned in the supertype
    this.capacitor = capacitor;
  }

  /**
   * @param {CircuitResult} circuitResult
   * @public
   */
  applySolution( circuitResult ) {
    this.capacitor.currentProperty.value = circuitResult.getTimeAverageCurrent( this.dynamicCircuitCapacitor );
    this.capacitor.mnaCurrent = CCKCUtils.clampMagnitude( circuitResult.getInstantaneousCurrent( this.dynamicCircuitCapacitor ) );
    this.capacitor.mnaVoltageDrop = CCKCUtils.clampMagnitude( circuitResult.getFinalState().dynamicCircuitSolution.getNodeVoltage( this.capacitorVoltageNode1 )
                                                              - circuitResult.getFinalState().dynamicCircuitSolution.getNodeVoltage( this.capacitorVoltageNode0 ) );


    assert && assert( Math.abs( this.capacitor.mnaCurrent ) < 1E100, 'mnaCurrent out of range' );
    assert && assert( Math.abs( this.capacitor.mnaVoltageDrop ) < 1E100, 'mnaVoltageDrop out of range' );
  }
}

class InductorAdapter extends DynamicCircuit.DynamicInductor {

  /**
   * @param {Circuit} circuit
   * @param {Inductor} inductor
   */
  constructor( circuit, inductor ) {
    const dynamicCircuitInductor = new DynamicCircuit.Inductor(
      circuit.vertexGroup.indexOf( inductor.startVertexProperty.value ),
      circuit.vertexGroup.indexOf( inductor.endVertexProperty.value ),
      inductor.inductanceProperty.value
    );

    super( dynamicCircuitInductor, new DynamicCircuit.DynamicElementState( inductor.mnaVoltageDrop, inductor.mnaCurrent ) );

    // @private - alongside this.dynamicCircuitInductor assigned in the supertype
    this.inductor = inductor;
  }

  /**
   * @param {CircuitResult} circuitResult
   * @public
   */
  applySolution( circuitResult ) {
    this.inductor.currentProperty.value = -circuitResult.getTimeAverageCurrent( this.dynamicCircuitInductor );
    this.inductor.mnaCurrent = CCKCUtils.clampMagnitude( circuitResult.getInstantaneousCurrent( this.dynamicCircuitInductor ) );
    this.inductor.mnaVoltageDrop = CCKCUtils.clampMagnitude( circuitResult.getInstantaneousVoltage( this.dynamicCircuitInductor ) );
    assert && assert( Math.abs( this.inductor.mnaCurrent ) < 1E100, 'mnaCurrent out of range' );
    assert && assert( Math.abs( this.inductor.mnaVoltageDrop ) < 1E100, 'mnaVoltageDrop out of range' );
  }
}

class ModifiedNodalAnalysisAdapter {

  /**
   * Solves the system with Modified Nodal Analysis, and apply the results back to the Circuit.
   * @param {Circuit} circuit
   * @param {number} dt
   * @public
   */
  static solveModifiedNodalAnalysis( circuit, dt ) {

    const resistiveBatteryAdapters = [];
    const resistorAdapters = [];
    const capacitorAdapters = [];
    const inductorAdapters = [];

    // Identify CircuitElements that are not in a loop with a voltage source. They will have their currents zeroed out.
    const nonParticipants = [];
    const participants = [];
    for ( let i = 0; i < circuit.circuitElements.length; i++ ) {
      const circuitElement = circuit.circuitElements.get( i );

      if ( circuit.isInLoopWithVoltageSource( circuitElement ) ) {
        participants.push( circuitElement );
      }

      if ( !circuit.isInLoopWithVoltageSource( circuitElement ) ) {
        nonParticipants.push( circuitElement );
      }
      else if ( circuitElement instanceof VoltageSource ) {
        resistiveBatteryAdapters.push( new ResistiveBatteryAdapter( circuit, circuitElement ) );
      }
      else if ( circuitElement instanceof Resistor ||
                circuitElement instanceof Fuse ||
                circuitElement instanceof Wire ||
                circuitElement instanceof LightBulb ||
                circuitElement instanceof SeriesAmmeter ||

                // Since no closed circuit there; see below where current is zeroed out
                ( circuitElement instanceof Switch && circuitElement.closedProperty.value ) ) {
        resistorAdapters.push( new ResistorAdapter( circuit, circuitElement ) );
      }
      else if ( circuitElement instanceof Switch && !circuitElement.closedProperty.value ) {

        // no element for an open switch
      }
      else if ( circuitElement instanceof Capacitor ) {
        capacitorAdapters.push( new CapacitorAdapter( circuit, circuitElement ) );
      }
      else if ( circuitElement instanceof Inductor ) {
        inductorAdapters.push( new InductorAdapter( circuit, circuitElement ) );
      }
      else {
        assert && assert( false, `Type not found: ${circuitElement.constructor.name}` );
      }
    }

    const dynamicCircuit = new DynamicCircuit( resistorAdapters, resistiveBatteryAdapters, capacitorAdapters, inductorAdapters );
    let circuitResult = dynamicCircuit.solveWithSubdivisions( TIMESTEP_SUBDIVISIONS, dt );

    // if any battery exceeds its current threshold, increase its resistance and run the solution again.
    // see https://github.com/phetsims/circuit-construction-kit-common/issues/245
    let needsHelp = false;

    resistorAdapters.forEach( resistorAdapter => {
      if ( resistorAdapter.circuitElement instanceof LightBulb && resistorAdapter.circuitElement.real ) {
        resistorAdapter.resistance = 1.0;
        needsHelp = true;
      }
    } );

    resistiveBatteryAdapters.forEach( batteryAdapter => {
      if ( Math.abs( circuitResult.getTimeAverageCurrent( batteryAdapter ) ) > CCKCQueryParameters.batteryCurrentThreshold ) {
        batteryAdapter.resistance = batteryAdapter.battery.internalResistanceProperty.value;
        needsHelp = true;
      }
    } );

    resistorAdapters.forEach( resistorAdapter => {
      if ( resistorAdapter.circuitElement instanceof LightBulb && resistorAdapter.circuitElement.real ) {

        const logWithBase = ( value, base ) => Math.log( value ) / Math.log( base );

        const v0 = circuitResult.resultSet.getFinalState().dynamicCircuitSolution.getNodeVoltage( resistorAdapter.nodeId0 );
        const v1 = circuitResult.resultSet.getFinalState().dynamicCircuitSolution.getNodeVoltage( resistorAdapter.nodeId1 );
        const V = Math.abs( v1 - v0 );

        const base = 2;

        // I = ln(V)
        // V=IR
        // V=ln(V)R
        // R = V/ln(V)

        // Adjust so it looks good in comparison to a standard bulb
        const coefficient = 3;

        // shift by base so at V=0 the log is 1
        resistorAdapter.value = 10 + coefficient * V / logWithBase( V + base, base );
        resistorAdapter.circuitElement.resistanceProperty.value = resistorAdapter.value;
      }
    } );

    if ( needsHelp ) {
      circuitResult = dynamicCircuit.solveWithSubdivisions( TIMESTEP_SUBDIVISIONS, dt );
    }

    resistiveBatteryAdapters.forEach( batteryAdapter => batteryAdapter.applySolution( circuitResult ) );
    resistorAdapters.forEach( resistorAdapter => resistorAdapter.applySolution( circuitResult ) );
    capacitorAdapters.forEach( capacitorAdapter => capacitorAdapter.applySolution( circuitResult ) );
    inductorAdapters.forEach( inductorAdapter => inductorAdapter.applySolution( circuitResult ) );

    // zero out currents on open branches
    nonParticipants.forEach( circuitElement => circuitElement.currentProperty.set( 0 ) );

    const visitedVertices = [];

    // Apply the node voltages to the vertices
    circuit.vertexGroup.forEach( ( vertex, i ) => {
      const voltage = circuitResult.resultSet.getFinalState().dynamicCircuitSolution.getNodeVoltage( i );

      if ( typeof voltage === 'number' ) {
        visitedVertices.push( vertex );
        vertex.voltageProperty.set( voltage );
      }
      else {

        // Unconnected vertices like those in the black box may not have an entry in the matrix, so mark them as zero.
        // Other vertices will be visited in the search below.
        vertex.voltageProperty.set( 0 );
      }
    } );

    // compute voltages for open branches
    // for each connected component, start at a known voltage and depth first search the graph.
    const visit = pathElement => {

      const startVertex = pathElement.startVertex;
      const circuitElement = pathElement.circuitElement;
      const endVertex = pathElement.endVertex;

      if ( !visitedVertices.includes( endVertex ) ) {

        const sign = startVertex === circuitElement.startVertexProperty.value ? 1 : -1;

        // compute end voltage from start voltage
        if ( circuitElement instanceof Resistor || circuitElement instanceof Wire || circuitElement instanceof LightBulb ||
             ( circuitElement instanceof Switch && circuitElement.closedProperty.value ) || circuitElement instanceof Fuse ||
             circuitElement instanceof SeriesAmmeter
        ) {

          // In the general case, we would need V=IR to compute the voltage drop, but we know the current across the
          // non-participants is 0, so the voltage drop across them is also zero
          endVertex.voltageProperty.value = startVertex.voltageProperty.value;
          visitedVertices.push( endVertex );
        }
        else if ( circuitElement instanceof VoltageSource ) {
          endVertex.voltageProperty.value = startVertex.voltageProperty.value + sign * circuitElement.voltageProperty.value;
          visitedVertices.push( endVertex );
        }
        else if ( circuitElement instanceof Capacitor || circuitElement instanceof Inductor ) {
          endVertex.voltageProperty.value = startVertex.voltageProperty.value + sign * circuitElement.mnaVoltageDrop;
          visitedVertices.push( endVertex );
        }
        else if ( circuitElement instanceof Switch && !circuitElement.closedProperty.value ) {
          // for an open switch, the node voltages are independent
        }
        else {
          assert && assert( false, 'unknown circuit element type: ' + circuitElement.constructor.name );
        }
      }
    };

    // If anything wasn't visited yet (if it is a different connected component), visit now
    circuit.circuitElements.forEach( circuitElement => {

      const seed = {
        startVertex: circuitElement.startVertexProperty.value,
        circuitElement: circuitElement,
        endVertex: circuitElement.endVertexProperty.value
      };
      visitedVertices.push( seed.startVertex );
      visit( seed );
      circuit.depthFirstSearch( [ seed ], ( path, newPathElement ) => visit( newPathElement ) );
    } );
  }
}

circuitConstructionKitCommon.register( 'ModifiedNodalAnalysisAdapter', ModifiedNodalAnalysisAdapter );
export default ModifiedNodalAnalysisAdapter;