// Copyright 2015-2021, University of Colorado Boulder

/**
 * Contains circuit, voltmeter, ammeter and properties to indicate what mode the model is in. This exists for the life
 * of the sim and hence does not need a dispose implementation.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import BooleanProperty from '../../../axon/js/BooleanProperty.js';
import Emitter from '../../../axon/js/Emitter.js';
import StringIO from '../../../tandem/js/types/StringIO.js';
import Property from '../../../axon/js/Property.js';
import NumberProperty from '../../../axon/js/NumberProperty.js';
import Utils from '../../../dot/js/Utils.js';
import merge from '../../../phet-core/js/merge.js';
import Range from '../../../dot/js/Range.js';
import Stopwatch from '../../../scenery-phet/js/Stopwatch.js';
import CCKCConstants from '../CCKCConstants.js';
import CCKCQueryParameters from '../CCKCQueryParameters.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import ZoomControlPanel from '../view/ZoomControlPanel.js';
import Ammeter from './Ammeter.js';
import Circuit from './Circuit.js';
import Voltmeter from './Voltmeter.js';
import ZoomAnimation from './ZoomAnimation.js';
import Tandem from '../../../tandem/js/Tandem.js';
import Bounds2 from '../../../dot/js/Bounds2.js';
import CircuitElementViewType from './CircuitElementViewType.js';

type CircuitConstructionKitModelOptions = {
  blackBoxStudy: boolean,
  revealing: boolean
};

class CircuitConstructionKitModel {
  private zoomAnimation: ZoomAnimation | null;
  private readonly viewTypeProperty: Property<CircuitElementViewType>;
  private readonly addRealBulbsProperty: BooleanProperty;
  private readonly circuit: Circuit;
  private readonly voltmeters: Voltmeter[];
  private readonly ammeters: Ammeter[];
  private readonly isValueDepictionEnabledProperty: BooleanProperty;
  private readonly showLabelsProperty: BooleanProperty;
  private readonly showValuesProperty: BooleanProperty;
  private readonly selectedZoomProperty: NumberProperty;
  private readonly currentZoomProperty: NumberProperty;
  private readonly isPlayingProperty: BooleanProperty;
  private readonly modeProperty: Property<string>;
  private readonly revealingProperty: BooleanProperty;
  private readonly blackBoxBounds: Bounds2 | null;
  private readonly stopwatch: Stopwatch;
  private readonly stepEmitter: Emitter<[ number ]>;

  /**
   * @param {Tandem} tandem
   * @param {Object} [options]
   */
  constructor( tandem: Tandem, options?: Partial<CircuitConstructionKitModelOptions> ) {

    const filledOptions = merge( {

      // Determines whether electrons can be shown.  In black box, electrons can only be shown when the user reveals
      // the answer by pressing the reveal answer button.
      revealing: true,
      blackBoxStudy: false
    }, options ) as CircuitConstructionKitModelOptions

    // @private {ZoomAnimation|null} - animation for the zoom level or null if not animating
    this.zoomAnimation = null;

    // @public {Property.<CircuitElementViewType>} - whether to show lifelike or schematic representations
    this.viewTypeProperty = new Property( 'lifelike', {
      tandem: tandem.createTandem( 'viewTypeProperty' ),
      phetioType: Property.PropertyIO( StringIO ) // TODO: Validvalues for studio?
    } );

    // @public {Property.<boolean>} - whether the carousel shows real bulbs
    this.addRealBulbsProperty = new BooleanProperty( CCKCQueryParameters.addRealBulbs, {
      tandem: tandem.createTandem( 'addRealBulbsProperty' )
    } );

    // @public (read-only) {Circuit} - contains CircuitElements, Vertices, etc.
    this.circuit = new Circuit( this.viewTypeProperty, this.addRealBulbsProperty, tandem.createTandem( 'circuit' ), { blackBoxStudy: filledOptions.blackBoxStudy } );

    // @public (read-only) {Voltmeter[]} - created statically and indexed starting at 1 for human-readability for PhET-iO
    this.voltmeters = [
      new Voltmeter( tandem.createTandem( 'voltmeter1' ), 1 ),
      new Voltmeter( tandem.createTandem( 'voltmeter2' ), 2 )
    ];

    // @public (read-only) {Ammeter[]} - created statically and indexed starting at 1 for human-readability for PhET-iO
    this.ammeters = [
      new Ammeter( tandem.createTandem( 'ammeter1' ), 1 ),
      new Ammeter( tandem.createTandem( 'ammeter2' ), 2 )
    ];

    // @public {BooleanProperty} - changes whether the light bulb brightness and ammeter/voltmeter readouts,
    // charges, flame, etc. can be seen
    this.isValueDepictionEnabledProperty = new BooleanProperty(
      !CCKCQueryParameters.showDepictValuesToggleButton, {
        tandem: tandem.createTandem( 'isValueDepictionEnabledProperty' )
      } );

    // @public {BooleanProperty} - true if the labels in the toolbox should be shown
    this.showLabelsProperty = new BooleanProperty( true, {
      tandem: tandem.createTandem( 'showLabelsProperty' )
    } );

    // @public {BooleanProperty} - true if the labels in the toolbox should be shown
    this.showValuesProperty = new BooleanProperty( false, {
      tandem: tandem.createTandem( 'showValuesProperty' )
    } );

    // @public {Property.<number>} scaling applied to the circuit node so the user can zoom out and make larger circuits
    // 0 = zoomed out fully, 1 = zoomed in fully
    this.selectedZoomProperty = new NumberProperty( 1, {
      tandem: tandem.createTandem( 'selectedZoomProperty' ),
      range: new Range( 0, 1 )
    } );

    // @public (read-only) {Property.<number>} the animated value of the zoom level
    this.currentZoomProperty = new NumberProperty( this.selectedZoomProperty.get(), {
      tandem: tandem.createTandem( 'currentZoomProperty' )
    } );

    this.selectedZoomProperty.lazyLink( ( newValue: number ) => {
      this.zoomAnimation = new ZoomAnimation( this.currentZoomProperty.get(), newValue, ( delta: number ) => {
        const proposedZoomValue = this.currentZoomProperty.value + delta;
        const boundedValue = Utils.clamp( proposedZoomValue, ZoomControlPanel.ZOOMED_OUT, ZoomControlPanel.ZOOMED_IN );
        this.currentZoomProperty.value = boundedValue;
      } );
    } );

    // @public (read-only) {Property.<number>} True if the simulation is playing, controlled by the TimeControlNode
    this.isPlayingProperty = new BooleanProperty( true, {
      tandem: tandem.createTandem( 'isPlayingProperty' ),
      phetioFeatured: true
    } );

    // @public {Property.<InteractionMode>} - whether the user is in the CircuitConstructionKitModel.InteractionMode.EXPLORE or CircuitConstructionKitModel.InteractionMode.TEST mode
    this.modeProperty = new Property( 'explore', {
      tandem: tandem.createTandem( 'modeProperty' ),
      phetioType: Property.PropertyIO( StringIO ) // TODO: validValues for studio?
    } );

    // When the user manipulates something, hide the readouts, see
    // https://github.com/phetsims/circuit-construction-kit/issues/130
    // The following cases result in hiding the readouts:
    // 1. More components are dragged out of the toolbox
    // 2. Any vertex is broken
    // 3. Component voltage/resistance is edited
    // 4. A component within a circuit is deleted, see
    // https://github.com/phetsims/circuit-construction-kit-black-box-study/issues/16
    // However, the simulation should not pause when switching between "Explore" and "Test" and "Reveal" in the black
    // box study sim
    const modeChanging = false;

    // TODO (black-box-study): started/endedCallbacksForChangedEmitters don't exist anymore. Rewrite if commented back in.
    // this.modeProperty.startedCallbacksForChangedEmitter.addListener( function() {
    //   modeChanging = true;
    // } );
    // this.modeProperty.endedCallbacksForChangedEmitter.addListener( function() {
    //   modeChanging = false;
    // } );
    if ( CCKCQueryParameters.showDepictValuesToggleButton ) {

      // TODO (black-box-study) fix this
      const pause = () => {
        if ( !modeChanging ) {
          this.isValueDepictionEnabledProperty.value = false;
        }
      };
      this.circuit.vertexGroup.elementCreatedEmitter.addListener( pause );
      this.circuit.vertexGroup.elementDisposedEmitter.addListener( pause );
      this.circuit.componentEditedEmitter.addListener( pause );
      this.circuit.circuitElements.lengthProperty.link( pause );
    }

    // Broad channel for PhET-iO that signifies a change in the circuit. Wrapper listeners can call get state after circuit
    // changes to obtain the new circuit.
    const circuitChangedEmitter = new Emitter( {
      tandem: tandem.createTandem( 'circuitChangedEmitter' )
    } );

    const emitCircuitChanged = () => circuitChangedEmitter.emit();
    this.circuit.vertexGroup.elementCreatedEmitter.addListener( emitCircuitChanged );
    this.circuit.vertexGroup.elementDisposedEmitter.addListener( emitCircuitChanged );
    this.circuit.componentEditedEmitter.addListener( emitCircuitChanged );

    // When the simulation pauses and resumes, clear the time scaling factor (so it doesn't show a stale value)
    this.isValueDepictionEnabledProperty.link( () => this.circuit.chargeAnimator.timeScaleRunningAverage.clear() );

    // When the view changes between schematic/lifelike, update the electron paths (because the LightBulb has a different
    // charge path depending on the view
    this.viewTypeProperty.link( () => {

      // First update the length of the light bulbs
      this.circuit.circuitElements.forEach( circuitElement => {

        // @ts-ignore
        circuitElement.updatePathLength && circuitElement.updatePathLength();
      } );

      // Then position the electrons in the new paths
      this.circuit.relayoutAllCharges();
    } );

    // @public - true when the user is holding down the reveal button and the answer (inside the black box) is showing
    this.revealingProperty = new BooleanProperty( filledOptions.revealing, {
      tandem: tandem.createTandem( 'revealingProperty' )
    } );

    // @public {Bounds2} - bounds of the black box, if any.  Set by subclass in Black Box Study. Specifically, filled
    // in by the BlackBoxSceneView after the black box node is created and positioned
    this.blackBoxBounds = null;

    // @public
    this.stopwatch = new Stopwatch( {
      tandem: tandem.createTandem( 'stopwatch' )
    } );

    // @public {Emitter.<number>} - Indicates when the model has updated, some views need to update accordingly
    this.stepEmitter = new Emitter( {
      parameters: [ { valueType: 'number' } ]
    } );
  }

  /**
   * @public
   */
  stepSingleStep() {

    // 6/60 = 0.1 second, run over multiple steps to maintain smooth curves in the charts
    _.times( 6, () => this.stepOnce( 1 / 60 ) );
    this.circuit.layoutChargesInDirtyCircuitElements();
  }

  /**
   * Step forward one step, whether automatically or when the step button is pressed.
   * @param {number} dt
   * @private
   */
  stepOnce( dt: number ) {

    // Only move charges if the simulation is not paused.
    this.isValueDepictionEnabledProperty.value && this.circuit.step( dt );
    this.stopwatch.step( dt );
    this.stepEmitter.emit( dt );
  }

  /**
   * Update the circuit and zoom level when the simulation clock steps.
   * @param {number} dt - elapsed time in seconds
   * @public
   */
  step( dt: number ) {

    // If the step is large, it probably means that the screen was hidden for a while, so just ignore it.
    // see https://github.com/phetsims/circuit-construction-kit-common/issues/476
    if ( dt >= CCKCConstants.MAX_DT ) {
      return;
    }

    if ( this.zoomAnimation ) {
      const animationRatio = this.zoomAnimation.step( dt );
      if ( animationRatio >= 1 ) {
        this.zoomAnimation = null;
      }
    }

    if ( this.isPlayingProperty.value || this.circuit.dirty ) {
      this.stepOnce( this.isPlayingProperty.value ? dt : CCKCConstants.PAUSED_DT );
    }

    this.circuit.layoutChargesInDirtyCircuitElements();
  }

  /**
   * Reset the circuit.
   * @public
   */
  reset() {
    this.isValueDepictionEnabledProperty.reset();
    this.showLabelsProperty.reset();
    this.showValuesProperty.reset();
    this.modeProperty.reset();
    this.circuit.reset();
    this.voltmeters.forEach( voltmeter => voltmeter.reset() );
    this.ammeters.forEach( ammeter => ammeter.reset() );
    this.viewTypeProperty.reset();
    this.currentZoomProperty.reset();
    this.selectedZoomProperty.reset();
    this.stopwatch.reset();
    this.isPlayingProperty.reset();
    this.addRealBulbsProperty.reset();

    // cancel any animation in progress, including (but not limited to) one that may have just been caused by reset
    this.zoomAnimation = null;
  }
}

circuitConstructionKitCommon.register( 'CircuitConstructionKitModel', CircuitConstructionKitModel );
export default CircuitConstructionKitModel;