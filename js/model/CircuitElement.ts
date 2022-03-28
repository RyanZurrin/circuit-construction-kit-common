// Copyright 2016-2022, University of Colorado Boulder

/**
 * CircuitElement is the base class for all elements that can be part of a circuit, including:
 * Wire, Resistor, Battery, LightBulb, Switch.  It has a start vertex and end vertex and a model for its own current.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import BooleanProperty from '../../../axon/js/BooleanProperty.js';
import Emitter from '../../../axon/js/Emitter.js';
import NumberProperty from '../../../axon/js/NumberProperty.js';
import Property from '../../../axon/js/Property.js';
import Matrix3 from '../../../dot/js/Matrix3.js';
import Vector2 from '../../../dot/js/Vector2.js';
import { SceneryEvent } from '../../../scenery/js/imports.js';
import PhetioObject, { PhetioObjectOptions } from '../../../tandem/js/PhetioObject.js';
import Tandem from '../../../tandem/js/Tandem.js';
import IOType from '../../../tandem/js/types/IOType.js';
import ReferenceIO from '../../../tandem/js/types/ReferenceIO.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import Circuit from './Circuit.js';
import CurrentSense from './CurrentSense.js';
import Vertex from './Vertex.js';
import IReadOnlyProperty, { PropertyLinkListener } from '../../../axon/js/IReadOnlyProperty.js';
import optionize from '../../../phet-core/js/optionize.js';
import StringProperty from '../../../axon/js/StringProperty.js';
import EnumerationProperty from '../../../axon/js/EnumerationProperty.js';
import IntentionalAny from '../../../phet-core/js/types/IntentionalAny.js';

// variables
let index = 0;

type SelfOptions = {
  isFlammable?: boolean;
  isMetallic?: boolean;
  isSizeChangedOnViewChange?: boolean;
  isCurrentReentrant?: boolean;
  interactive?: boolean;
  insideTrueBlackBox?: boolean;
};

export type CircuitElementOptions = SelfOptions & PhetioObjectOptions;

export default abstract class CircuitElement extends PhetioObject {

  // unique identifier for looking up corresponding views
  readonly id: number;

  // track the time of creation so it can't be dropped in the toolbox for 0.5 seconds see https://github.com/phetsims/circuit-construction-kit-common/issues/244
  private readonly creationTime: number;

  // flammable circuit elements can catch on fire
  readonly isFlammable: boolean;

  // metallic circuit elements behave like exposed wires--sensor values can be read directly on the resistor. For
  // instance, coins and paper clips and wires are metallic and can have their values read directly.
  readonly isMetallic: boolean;

  // whether the size changes when changing from lifelike/schematic, used to determine whether the highlight region
  // should be changed.  True for everything except the switch.
  readonly isSizeChangedOnViewChange: boolean;

  // the Vertex at the origin of the CircuitElement, may change when CircuitElements are connected
  readonly startVertexProperty: Property<Vertex>;

  // the Vertex at the end of the CircuitElement, may change when CircuitElements are connected
  readonly endVertexProperty: Property<Vertex>;

  // the flowing current, in amps.
  readonly currentProperty: Property<number>;
  readonly currentSenseProperty: Property<CurrentSense>;

  // true if the CircuitElement can be edited and dragged
  readonly interactiveProperty: BooleanProperty;

  // whether the circuit element is inside the true black box, not inside the user-created black box, on the interface
  // or outside of the black box
  readonly insideTrueBlackBoxProperty: BooleanProperty;

  // true if the charge layout must be updated (each element is visited every frame to check this)
  chargeLayoutDirty: boolean;

  // indicate when this CircuitElement has been connected to another CircuitElement
  readonly connectedEmitter: Emitter<[]>;

  // indicate when an adjacent Vertex has moved to front, so that the corresponding Node can move to front too
  readonly vertexSelectedEmitter: Emitter<[]>;

  // indicate when either Vertex has moved
  readonly vertexMovedEmitter: Emitter<[]>;

  // indicate when the CircuitElement has been moved to the front in z-ordering
  readonly moveToFrontEmitter: Emitter<[]>;

  // indicate when the circuit element has started being dragged, when it is created in the toolbox
  readonly startDragEmitter: Emitter<[ SceneryEvent ]>;

  // indicate when the circuit element has been disposed
  readonly disposeEmitterCircuitElement: Emitter<[]>;
  private readonly vertexMovedListener: () => void;
  private readonly linkVertexListener: PropertyLinkListener<Vertex>;

  // named so it doesn't collide with the specified voltageProperty in Battery or ACVoltage
  readonly voltageDifferenceProperty: NumberProperty;
  private readonly vertexVoltageListener: () => void;

  // (read-only by clients, writable-by-subclasses) {number} the distance the charges must take to get to the other side
  // of the component. This is typically the distance between vertices, but not for light bulbs.  This value is constant,
  // except for (a) wires which can have their length changed and (b) LightBulbs whose path length changes when switching
  // between LIFELIKE |SCHEMATIC
  chargePathLength: number;

  // The ammeter update is called after items are disposed but before corresponding views are disposed, so we must
  // take care not to display current for any items that are pending deletion.
  // See https://github.com/phetsims/circuit-construction-kit-common/issues/418
  circuitElementDisposed: boolean;

  static CircuitElementIO: IOType;
  readonly lengthProperty: Property<number> | undefined;
  readonly isEditableProperty: BooleanProperty;
  readonly isDisposableProperty: BooleanProperty;
  isValueDisplayableProperty: BooleanProperty;
  labelTextProperty: StringProperty;

  constructor( startVertex: Vertex, endVertex: Vertex, chargePathLength: number, tandem: Tandem, providedOptions?: CircuitElementOptions ) {
    assert && assert( startVertex !== endVertex, 'startVertex cannot be the same as endVertex' );
    assert && assert( typeof chargePathLength === 'number', 'charge path length should be a number' );
    assert && assert( chargePathLength > 0, 'charge path length must be positive' );

    const options = optionize<CircuitElementOptions, SelfOptions, PhetioObjectOptions>( {
      interactive: true, // In CCK: Black Box Study, CircuitElements in the black box cannot be manipulated
      isSizeChangedOnViewChange: true,
      insideTrueBlackBox: false,
      isMetallic: false, // Metallic items can have their voltage read directly (unshielded)
      isFlammable: false,
      tandem: tandem,
      isCurrentReentrant: false,
      phetioDynamicElement: true,
      phetioType: CircuitElement.CircuitElementIO
    }, providedOptions );

    super( options );

    this.id = index++;
    this.creationTime = phet.joist.elapsedTime;
    this.isFlammable = options.isFlammable;
    this.isMetallic = options.isMetallic;
    this.isSizeChangedOnViewChange = options.isSizeChangedOnViewChange;

    this.startVertexProperty = new Property( startVertex, {
      phetioType: Property.PropertyIO( Vertex.VertexIO ),
      tandem: tandem.createTandem( 'startVertexProperty' ),
      phetioState: false
    } );

    this.endVertexProperty = new Property( endVertex, {
      phetioType: Property.PropertyIO( Vertex.VertexIO ),
      tandem: tandem.createTandem( 'endVertexProperty' ),
      phetioState: false
    } );

    this.currentProperty = new NumberProperty( 0, {
      reentrant: options.isCurrentReentrant
    } );
    this.currentProperty.link( current => {
      assert && assert( !isNaN( current ) );
    } );

    // we assign the directionality based on the initial current direction, so the initial current is always positive.
    // see https://github.com/phetsims/circuit-construction-kit-common/issues/508
    this.currentSenseProperty = new EnumerationProperty( CurrentSense.UNSPECIFIED );

    this.interactiveProperty = new BooleanProperty( options.interactive );
    this.insideTrueBlackBoxProperty = new BooleanProperty( options.insideTrueBlackBox );
    this.chargeLayoutDirty = true;
    this.connectedEmitter = new Emitter();
    this.moveToFrontEmitter = new Emitter();
    this.vertexSelectedEmitter = new Emitter();
    this.vertexMovedEmitter = new Emitter();
    this.startDragEmitter = new Emitter( { parameters: [ { valueType: SceneryEvent } ] } );
    this.disposeEmitterCircuitElement = new Emitter();

    // Signify that a Vertex moved
    this.vertexMovedListener = this.emitVertexMoved.bind( this );

    // stored for disposal
    this.linkVertexListener = this.linkVertex.bind( this );

    this.startPositionProperty.link( this.vertexMovedListener );
    this.endPositionProperty.link( this.vertexMovedListener );

    this.voltageDifferenceProperty = new NumberProperty( this.computeVoltageDifference() );

    this.vertexVoltageListener = () => this.voltageDifferenceProperty.set( this.computeVoltageDifference() );

    // @ts-ignore
    this.startVertexProperty.link( this.linkVertexListener );
    // @ts-ignore
    this.endVertexProperty.link( this.linkVertexListener );
    this.chargePathLength = chargePathLength;
    this.circuitElementDisposed = false;
    this.lengthProperty = undefined;

    // PhET-iO-specific Properties
    this.isEditableProperty = new BooleanProperty( true, {
      tandem: tandem.createTandem( 'isEditableProperty' ),
      phetioDocumentation: 'Whether the CircuitElement can have its numerical characteristics changed by the user'
    } );

    this.isDisposableProperty = new BooleanProperty( true, {
      tandem: tandem.createTandem( 'isDisposableProperty' ),
      phetioDocumentation: 'Whether the CircuitElement can be disposed. Set this to false to make the CircuitElement persisent'
    } );

    this.isValueDisplayableProperty = new BooleanProperty( true, {
      tandem: tandem.createTandem( 'isValueDisplayableProperty' ),
      phetioDocumentation: 'Whether the CircuitElement\'s value can be displayed when the "values" checkbox is selected'
    } );

    this.labelTextProperty = new StringProperty( '', {
      tandem: tandem.createTandem( 'labelTextProperty' ),
      phetioDocumentation: 'Shows a custom text label next to the circuit element'
    } );
  }

  /**
   * Determine the voltage difference between end vertex and start vertex
   * @returns {number}
   */
  private computeVoltageDifference() {
    return this.endVertexProperty.value.voltageProperty.value -
           this.startVertexProperty.value.voltageProperty.value;
  }

  /**
   * When the start or end Vertex changes, move the listeners from the old Vertex to the new one
   * @param newVertex - the new vertex
   * @param oldVertex - the previous vertex
   * @param property
   */
  private linkVertex( newVertex: Vertex, oldVertex: Vertex | null, property: IReadOnlyProperty<Vertex> ) {

    // These guards prevent errors from the bad transient state caused by the Circuit.flip causing the same Vertex
    // to be both start and end at the same time.
    if ( oldVertex ) {
      oldVertex.positionProperty.hasListener( this.vertexMovedListener ) && oldVertex.positionProperty.unlink( this.vertexMovedListener );
      oldVertex.voltageProperty.hasListener( this.vertexVoltageListener ) && oldVertex.voltageProperty.unlink( this.vertexVoltageListener );

      if ( !oldVertex.positionProperty.get().equals( newVertex.positionProperty.get() ) ) {
        this.vertexMovedEmitter.emit();
      }
    }

    if ( !newVertex.positionProperty.hasListener( this.vertexMovedListener ) ) {
      newVertex.positionProperty.lazyLink( this.vertexMovedListener );
    }
    if ( !newVertex.voltageProperty.hasListener( this.vertexVoltageListener ) ) {
      newVertex.voltageProperty.link( this.vertexVoltageListener );
    }

    this.voltageDifferenceProperty.set( this.computeVoltageDifference() );
  }

  /**
   * Steps forward in time
   */
  step( time: number, dt: number, circuit: Circuit ) {
  }

  /**
   * Convenience method to get the start vertex position Property
   */
  get startPositionProperty(): Property<Vector2> {
    return this.startVertexProperty.get().positionProperty;
  }

  /**
   * Convenience method to get the end vertex position Property
   */
  get endPositionProperty(): Property<Vector2> {
    return this.endVertexProperty.get().positionProperty;
  }

  /**
   * Signify that a vertex has moved.
   */
  private emitVertexMoved() {

    // We are (hopefully!) in the middle of updating both vertices and we (hopefully!) will receive another callback
    // shortly with the correct values for both startPosition and endPosition
    // See https://github.com/phetsims/circuit-construction-kit-common/issues/413
    // if ( assert && this.isFixedCircuitElement && this.startPositionProperty.value.equals( this.endPositionProperty.value ) ) {
    //   assert && stepTimer.setTimeout( function() {
    //     assert && assert( !this.startPositionProperty.value.equals( this.endPositionProperty.value ), 'vertices cannot be in the same spot' );
    //   }, 0 );
    // }
    this.vertexMovedEmitter.emit();
  }

  /**
   * Release resources associated with this CircuitElement, called when it will no longer be used.
   */
  dispose(): void {
    assert && assert( !this.circuitElementDisposed, 'circuit element was already disposed' );
    this.circuitElementDisposed = true;

    // Notify about intent to dispose first because dispose listeners may need to access state
    this.disposeEmitterCircuitElement.emit();
    this.disposeEmitterCircuitElement.dispose();

    this.startVertexProperty.unlink( this.linkVertexListener );
    this.endVertexProperty.unlink( this.linkVertexListener );

    this.startPositionProperty.hasListener( this.vertexMovedListener ) && this.startPositionProperty.unlink( this.vertexMovedListener );
    this.endPositionProperty.hasListener( this.vertexMovedListener ) && this.endPositionProperty.unlink( this.vertexMovedListener );

    const startVoltageProperty = this.startVertexProperty.value.voltageProperty;
    const endVoltageProperty = this.endVertexProperty.value.voltageProperty;

    if ( startVoltageProperty.hasListener( this.vertexVoltageListener ) ) {
      startVoltageProperty.unlink( this.vertexVoltageListener );
    }

    if ( endVoltageProperty.hasListener( this.vertexVoltageListener ) ) {
      endVoltageProperty.unlink( this.vertexVoltageListener );
    }

    this.isEditableProperty.dispose();
    this.isDisposableProperty.dispose();
    this.isValueDisplayableProperty.dispose();
    this.startVertexProperty.dispose();
    this.endVertexProperty.dispose();
    this.labelTextProperty.dispose();

    super.dispose();
  }

  /**
   * Replace one of the vertices with a new one, when CircuitElements are connected.
   * @param oldVertex - the vertex which will be replaced.
   * @param newVertex - the vertex which will take the place of oldVertex.
   */
  replaceVertex( oldVertex: Vertex, newVertex: Vertex ): void {
    const startVertex = this.startVertexProperty.get();
    const endVertex = this.endVertexProperty.get();

    assert && assert( oldVertex !== newVertex, 'Cannot replace with the same vertex' );
    assert && assert( oldVertex === startVertex || oldVertex === endVertex, 'Cannot replace a nonexistent vertex' );
    assert && assert( newVertex !== startVertex && newVertex !== endVertex, 'The new vertex shouldn\'t already be ' +
                                                                            'in the circuit element.' );

    if ( oldVertex === startVertex ) {
      this.startVertexProperty.set( newVertex );
    }
    else {
      this.endVertexProperty.set( newVertex );
    }
  }

  /**
   * Gets the Vertex on the opposite side of the specified Vertex
   */
  getOppositeVertex( vertex: Vertex ): Vertex {
    assert && assert( this.containsVertex( vertex ), 'Missing vertex' );
    if ( this.startVertexProperty.get() === vertex ) {
      return this.endVertexProperty.get();
    }
    else {
      return this.startVertexProperty.get();
    }
  }

  /**
   * Returns whether this CircuitElement contains the specified Vertex as its startVertex or endVertex.
   */
  containsVertex( vertex: Vertex ): boolean {
    return this.startVertexProperty.get() === vertex || this.endVertexProperty.get() === vertex;
  }

  /**
   * Returns true if this CircuitElement contains both Vertex instances.
   */
  containsBothVertices( vertex1: Vertex, vertex2: Vertex ): boolean {
    return this.containsVertex( vertex1 ) && this.containsVertex( vertex2 );
  }

  /**
   * Updates the given matrix with the position and angle at the specified position along the element.
   * @param distanceAlongWire - the scalar distance from one endpoint to another.
   * @param matrix to be updated with the position and angle, so that garbage isn't created each time
   */
  updateMatrixForPoint( distanceAlongWire: number, matrix: Matrix3 ) {
    const startPosition = this.startPositionProperty.get();
    const endPosition = this.endPositionProperty.get();
    const translation = startPosition.blend( endPosition, distanceAlongWire / this.chargePathLength );
    assert && assert( !isNaN( translation.x ), 'x should be a number' );
    assert && assert( !isNaN( translation.y ), 'y should be a number' );
    const angle = Vector2.getAngleBetweenVectors( startPosition, endPosition );
    assert && assert( !isNaN( angle ), 'angle should be a number' );
    matrix.setToTranslationRotationPoint( translation, angle );
  }

  /**
   * Returns true if this CircuitElement contains the specified scalar position.
   */
  containsScalarPosition( scalarPosition: number ): boolean {
    return scalarPosition >= 0 && scalarPosition <= this.chargePathLength;
  }

  /**
   * Get all Property instances that influence the circuit dynamics.
   */
  abstract getCircuitProperties(): Property<IntentionalAny>[]

  /**
   * Get the midpoint between the vertices.  Used for dropping circuit elements into the toolbox.
   */
  getMidpoint(): Vector2 {
    const start = this.startVertexProperty.value.positionProperty.get();
    const end = this.endVertexProperty.value.positionProperty.get();
    return start.average( end );
  }

  toVertexString(): string {
    return `${this.startVertexProperty.value.index} -> ${this.endVertexProperty.value.index}`;
  }
}

const VertexReferenceIO = ReferenceIO( Vertex.VertexIO );

CircuitElement.CircuitElementIO = new IOType( 'CircuitElementIO', {
  valueType: CircuitElement,
  documentation: 'A Circuit Element, such as battery, resistor or wire',
  toStateObject: ( circuitElement: CircuitElement ) => ( {
    startVertexID: VertexReferenceIO.toStateObject( circuitElement.startVertexProperty.value ),
    endVertexID: VertexReferenceIO.toStateObject( circuitElement.endVertexProperty.value )
  } ),
  stateSchema: {
    startVertexID: VertexReferenceIO,
    endVertexID: VertexReferenceIO
  },
  stateToArgsForConstructor: ( stateObject: any ) => {
    return [
      VertexReferenceIO.fromStateObject( stateObject.startVertexID ),
      VertexReferenceIO.fromStateObject( stateObject.endVertexID )
    ];
  }
} );

circuitConstructionKitCommon.register( 'CircuitElement', CircuitElement );