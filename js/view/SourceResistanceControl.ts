// Copyright 2020-2022, University of Colorado Boulder

/**
 * Controls for showing and changing the battery internal resistance.  Exists for the life of the sim and hence does not
 * require a dispose implementation.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Denzell Barnett (PhET Interactive Simulations)
 */

import Utils from '../../../dot/js/Utils.js';
import StringUtils from '../../../phetcommon/js/util/StringUtils.js';
import { AlignGroup, Text, TextOptions, VBox } from '../../../scenery/js/imports.js';
import HSlider from '../../../sun/js/HSlider.js';
import CCKCConstants from '../CCKCConstants.js';
import CircuitConstructionKitCommonStrings from '../CircuitConstructionKitCommonStrings.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import Property from '../../../axon/js/Property.js';
import Tandem from '../../../tandem/js/Tandem.js';
import TReadOnlyProperty from '../../../axon/js/TReadOnlyProperty.js';

const resistanceOhmsSymbolStringProperty = CircuitConstructionKitCommonStrings.resistanceOhmsSymbolStringProperty;

export default class SourceResistanceControl extends VBox {

  /**
   * @param sourceResistanceProperty - axon Property for the internal resistance of all Batteries
   * @param alignGroup
   * @param batteryResistanceControlString
   * @param titleConfig
   * @param tandem
   */
  public constructor( sourceResistanceProperty: Property<number>, alignGroup: AlignGroup, batteryResistanceControlString: TReadOnlyProperty<string>, titleConfig: TextOptions, tandem: Tandem ) {

    /**
     * Creates label to be used for slider
     */
    const createLabel = ( string: TReadOnlyProperty<string>, tandem: Tandem ) => new Text( string, {
      fontSize: 12,
      tandem: tandem,
      maxWidth: 45
    } );

    const range = CCKCConstants.BATTERY_RESISTANCE_RANGE;
    const midpoint = ( range.max + range.min ) / 2;
    const slider = new HSlider( sourceResistanceProperty, range, {
      trackSize: CCKCConstants.SLIDER_TRACK_SIZE,
      thumbSize: CCKCConstants.THUMB_SIZE,
      majorTickLength: CCKCConstants.MAJOR_TICK_LENGTH,
      minorTickLength: CCKCConstants.MINOR_TICK_LENGTH,

      // Snap to the nearest whole number.
      constrainValue: ( value: number ) => range.constrainValue( Utils.roundSymmetric( value ) ),
      tandem: tandem.createTandem( 'slider' )
    } );
    slider.addMajorTick( range.min, createLabel( CircuitConstructionKitCommonStrings.tinyStringProperty, tandem.createTandem( 'tinyLabelText' ) ) );
    slider.addMajorTick( midpoint );
    slider.addMajorTick( range.max, createLabel( new Property( StringUtils.fillIn( resistanceOhmsSymbolStringProperty, {
      resistance: Utils.toFixed( range.max, 0 )
    } ) ), tandem.createTandem( 'maxLabelText' ) ) );

    for ( let i = range.min + 1; i < range.max; i++ ) {
      if ( Math.abs( i - midpoint ) > 1E-6 ) {
        slider.addMinorTick( i );
      }
    }

    const titleNode = new Text( batteryResistanceControlString, titleConfig );
    super( {
      children: [ titleNode, slider ],
      tandem: tandem,
      visiblePropertyOptions: {
        phetioFeatured: true
      }
    } );
  }
}

circuitConstructionKitCommon.register( 'SourceResistanceControl', SourceResistanceControl );