// Copyright 2015-2022, University of Colorado Boulder

/**
 * The ACVoltage is a circuit element that provides an oscillating voltage difference.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import NumberProperty from '../../../axon/js/NumberProperty.js';
import Property from '../../../axon/js/Property.js';
import Range from '../../../dot/js/Range.js';
import optionize from '../../../phet-core/js/optionize.js';
import MathSymbols from '../../../scenery-phet/js/MathSymbols.js';
import Tandem from '../../../tandem/js/Tandem.js';
import CCKCConstants from '../CCKCConstants.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import Circuit from './Circuit.js';
import Vertex from './Vertex.js';
import VoltageSource from './VoltageSource.js';
import { VoltageSourceOptions } from './VoltageSource.js';

// constants

// The maximum amplitude of the oscillating voltage
const MAX_VOLTAGE = 120;

type ACVoltageSelfOptions = {
};
type ACVoltageOptions = ACVoltageSelfOptions & VoltageSourceOptions;

class ACVoltage extends VoltageSource {

  // the maximum voltage, which can be controlled by the CircuitElementNumberControl
  readonly maximumVoltageProperty: NumberProperty;

  // the frequency of oscillation in Hz
  readonly frequencyProperty: NumberProperty;

  // the phase in degrees
  readonly phaseProperty: NumberProperty;

  private time: number;

  constructor( startVertex: Vertex, endVertex: Vertex, internalResistanceProperty: Property<number>, tandem: Tandem, providedOptions?: ACVoltageOptions ) {
    assert && assert( internalResistanceProperty, 'internalResistanceProperty should be defined' );

    const options = optionize<ACVoltageSelfOptions, VoltageSourceOptions, ACVoltageOptions, 'voltage' | 'initialOrientation'>()( {
      initialOrientation: 'right',
      voltage: 9.0,
      isFlammable: true,
      numberOfDecimalPlaces: 2,
      voltagePropertyOptions: {
        range: new Range( -MAX_VOLTAGE, MAX_VOLTAGE ),
        tandem: Tandem.REQUIRED
      }
    }, providedOptions );
    super( startVertex, endVertex, internalResistanceProperty, CCKCConstants.BATTERY_LENGTH, tandem, options );

    this.maximumVoltageProperty = new NumberProperty( options.voltage, {
      tandem: tandem.createTandem( 'maximumVoltageProperty' ),
      range: new Range( 0, MAX_VOLTAGE )
    } );

    this.frequencyProperty = new NumberProperty( 0.5, {
      tandem: tandem.createTandem( 'frequencyProperty' ),
      range: new Range( 0.1, 2.0 )
    } );

    this.phaseProperty = new NumberProperty( 0, {
      range: new Range( -180, 180 ),
      tandem: tandem.createTandem( 'phaseProperty' ),
      units: MathSymbols.DEGREES
    } );

    this.time = 0;
  }

  // Get the properties so that the circuit can be solved when changed.
  getCircuitProperties() {
    return [ this.frequencyProperty, this.phaseProperty, this.maximumVoltageProperty, ...super.getCircuitProperties() ];
  }

  // Dispose of this and PhET-iO instrumented children, so they will be unregistered.
  dispose() {
    this.maximumVoltageProperty.dispose();
    this.frequencyProperty.dispose();
    this.phaseProperty.dispose();
    super.dispose();
  }

  /**
   * @param time - total elapsed time
   * @param dt - delta between last frame and current frame
   * @param circuit
   */
  step( time: number, dt: number, circuit: Circuit ) {
    super.step( time, dt, circuit );
    this.time = time;
    this.voltageProperty.value = -this.maximumVoltageProperty.value * Math.sin( 2 * Math.PI * this.frequencyProperty.value * time + this.phaseProperty.value * Math.PI / 180 );
  }
}

circuitConstructionKitCommon.register( 'ACVoltage', ACVoltage );
export default ACVoltage;