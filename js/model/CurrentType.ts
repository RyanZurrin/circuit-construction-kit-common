// Copyright 2017-2022, University of Colorado Boulder

import Enumeration from '../../../phet-core/js/Enumeration.js';
import EnumerationValue from '../../../phet-core/js/EnumerationValue.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';

/**
 * Enumeration for how to render the current: electrons or conventional (arrows).
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
export default class CurrentType extends EnumerationValue {
  public static ELECTRONS = new CurrentType();
  public static CONVENTIONAL = new CurrentType();
  private static enumeration = new Enumeration( CurrentType );
}

circuitConstructionKitCommon.register( 'CurrentType', CurrentType );