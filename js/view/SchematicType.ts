// Copyright 2021-2022, University of Colorado Boulder

import Enumeration from '../../../phet-core/js/Enumeration.js';
import EnumerationValue from '../../../phet-core/js/EnumerationValue.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';

/**
 * Circuits schematic mode can be rendered as IEC or IEEE
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
export default class SchematicType extends EnumerationValue {
  public static IEC = new SchematicType();
  public static IEEE = new SchematicType();
  public static BRITISH = new SchematicType();
  private static enumeration = new Enumeration( SchematicType );
}

circuitConstructionKitCommon.register( 'SchematicType', SchematicType );