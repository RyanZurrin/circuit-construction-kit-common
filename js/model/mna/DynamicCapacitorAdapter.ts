// Copyright 2021, University of Colorado Boulder
import CCKCUtils from '../../CCKCUtils.js';
import Capacitor from '../Capacitor.js';
import CircuitResult from './CircuitResult.js';
import DynamicElementState from './DynamicElementState.js';
import DynamicCapacitor from './DynamicCapacitor.js';
import DynamicCircuitCapacitor from './DynamicCircuitCapacitor.js';

class DynamicCapacitorAdapter extends DynamicCapacitor {
  private readonly capacitor: Capacitor;

  /**
   * @param {Capacitor} capacitor
   */
  constructor( capacitor: Capacitor ) {

    const dynamicCircuitCapacitor = new DynamicCircuitCapacitor(
      capacitor.startVertexProperty.value.index + '',
      capacitor.endVertexProperty.value.index + '',
      capacitor.capacitanceProperty.value
    );
    super( dynamicCircuitCapacitor, new DynamicElementState( capacitor.mnaVoltageDrop, capacitor.mnaCurrent ) );

    // @private - alongside this.dynamicCircuitCapacitor assigned in the supertype
    this.capacitor = capacitor;
  }

  /**
   * @param {CircuitResult} circuitResult
   * @public
   */
  applySolution( circuitResult: CircuitResult ) {
    this.capacitor.currentProperty.value = circuitResult.getTimeAverageCurrent( this.dynamicCircuitCapacitor );
    this.capacitor.mnaCurrent = CCKCUtils.clampMagnitude( circuitResult.getInstantaneousCurrent( this.dynamicCircuitCapacitor ) );

    assert && assert( typeof this.capacitorVoltageNode1 === 'string' );
    assert && assert( typeof this.capacitorVoltageNode0 === 'string' );

    if ( typeof this.capacitorVoltageNode0 === 'string' && typeof this.capacitorVoltageNode1 === 'string' ) {
      this.capacitor.mnaVoltageDrop = CCKCUtils.clampMagnitude( circuitResult.getFinalState().dynamicCircuitSolution!.getNodeVoltage( this.capacitorVoltageNode1 )
                                                                - circuitResult.getFinalState().dynamicCircuitSolution!.getNodeVoltage( this.capacitorVoltageNode0 ) );
    }

    assert && assert( Math.abs( this.capacitor.mnaCurrent ) < 1E100, 'mnaCurrent out of range' );
    assert && assert( Math.abs( this.capacitor.mnaVoltageDrop ) < 1E100, 'mnaVoltageDrop out of range' );
  }
}

export default DynamicCapacitorAdapter;
