// Copyright 2019-2022, University of Colorado Boulder

/**
 * Model for an inductor.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import NumberProperty from '../../../axon/js/NumberProperty.js';
import Property from '../../../axon/js/Property.js';
import Range from '../../../dot/js/Range.js';
import merge from '../../../phet-core/js/merge.js';
import Tandem from '../../../tandem/js/Tandem.js';
import CCKCConstants from '../CCKCConstants.js';
import CCKCQueryParameters from '../CCKCQueryParameters.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import DynamicCircuitElement, { DynamicCircuitElementOptions } from './DynamicCircuitElement.js';
import Vertex from './Vertex.js';

// constants
const INDUCTOR_LENGTH = CCKCConstants.INDUCTOR_LENGTH;

type InductorOptions = {
  inductance: number;
} & DynamicCircuitElementOptions;

export default class Inductor extends DynamicCircuitElement {

  // the inductance in Henries
  readonly inductanceProperty: NumberProperty;
  static INDUCTANCE_DEFAULT = CCKCQueryParameters.inductanceDefault;
  static INDUCTANCE_RANGE = new Range( CCKCQueryParameters.inductanceMin, CCKCQueryParameters.inductanceMax );
  static INDUCTANCE_NUMBER_OF_DECIMAL_PLACES = CCKCQueryParameters.inductorNumberDecimalPlaces;

  /**
   * @param startVertex
   * @param endVertex
   * @param tandem
   * @param [providedOptions]
   */
  constructor( startVertex: Vertex, endVertex: Vertex, tandem: Tandem, providedOptions?: Partial<InductorOptions> ) {
    const options = merge( {
      inductance: Inductor.INDUCTANCE_DEFAULT,
      numberOfDecimalPlaces: Inductor.INDUCTANCE_NUMBER_OF_DECIMAL_PLACES
    }, providedOptions ) as InductorOptions;

    super( startVertex, endVertex, INDUCTOR_LENGTH, tandem, options );

    this.inductanceProperty = new NumberProperty( options.inductance, {
      range: Inductor.INDUCTANCE_RANGE,
      tandem: tandem.createTandem( 'inductanceProperty' )
    } );
  }

  /**
   * Dispose of this and PhET-iO instrumented children, so they will be unregistered.
   */
  override dispose(): void {
    this.inductanceProperty.dispose();
    super.dispose();
  }

  /**
   * Get the properties so that the circuit can be solved when changed.
   */
  getCircuitProperties(): Property<any>[] {
    return [ this.inductanceProperty ];
  }
}

circuitConstructionKitCommon.register( 'Inductor', Inductor );