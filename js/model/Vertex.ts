// Copyright 2016-2022, University of Colorado Boulder

/**
 * A Vertex indicates the end of one or more CircuitElements, or an open connection for the Black Box.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import BooleanProperty from '../../../axon/js/BooleanProperty.js';
import Emitter from '../../../axon/js/Emitter.js';
import TEmitter from '../../../axon/js/TEmitter.js';
import NumberProperty from '../../../axon/js/NumberProperty.js';
import Property from '../../../axon/js/Property.js';
import Vector2 from '../../../dot/js/Vector2.js';
import Vector2Property from '../../../dot/js/Vector2Property.js';
import optionize from '../../../phet-core/js/optionize.js';
import PhetioObject, { PhetioObjectOptions } from '../../../tandem/js/PhetioObject.js';
import Tandem from '../../../tandem/js/Tandem.js';
import IOType from '../../../tandem/js/types/IOType.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import LocalizedString from '../../../chipper/js/LocalizedString.js';
import TProperty from '../../../axon/js/TProperty.js';
import CircuitElement from './CircuitElement.js';

// Index counter for debugging
let counter = 0;

type SelfOptions = {
  draggable?: boolean;
  attachable?: boolean;
  interactive?: boolean;
  blackBoxInterface?: boolean;
  insideTrueBlackBox?: boolean;
};
type VertexOptions = SelfOptions & PhetioObjectOptions;

export default class Vertex extends PhetioObject {

  // Index counter for hashing in CircuitLayerNode.  Also useful for debugging and can be shown with ?vertexDisplay=index
  public readonly index: number;
  private readonly vertexTandem: Tandem;

  // position of the vertex
  public readonly positionProperty: Property<Vector2>;

  // where the vertex would be if it hadn't snapped to a proposed connection
  public readonly unsnappedPositionProperty: Property<Vector2>;

  // Relative voltage of the node, determined by Circuit.solve
  public readonly voltageProperty: Property<number>;

  // Some of the following properties overlap.  For example, if 'insideTrueBlackBox' is true, then the interactive
  // flag will be set to false when the circuit is in Circuit.InteractionMode.TEST mode.

  // Vertices on the black box interface persist between build/investigate, and cannot be moved/deleted
  public readonly isDraggableProperty: Property<boolean>;

  // Black box interface vertices can be interactive (tap to select) without being draggable
  public readonly interactiveProperty: Property<boolean>;

  // whether the Vertex can be dragged or moved by dragging another part of the circuit must be observable.  When two
  // vertices are joined in Circuit.connect, non-interactivity propagates
  public readonly attachableProperty: Property<boolean>;

  // whether the vertex is on the edge of a black box.  This means it cannot be deleted, but it can be attached to
  public readonly blackBoxInterfaceProperty: Property<boolean>;

  // whether the vertex is inside the true black box, not inside the user-created black box, on the interface or outside of the black box
  public readonly insideTrueBlackBoxProperty: Property<boolean>;

  // indicate when the vertex has been moved to the front in z-ordering and layering in the view must be updated
  public readonly relayerEmitter: TEmitter;

  // added by Circuit.js so that listeners can be removed when vertices are removed
  public vertexSelectedPropertyListener: ( ( selected: boolean ) => void ) | null;

  // Whether the vertex is being actively dragged.
  public isDragged: boolean;

  // for black box study
  public outerWireStub: boolean;
  public isCuttableProperty: BooleanProperty;
  public labelTextProperty: TProperty<string>;
  private readonly localizedString: LocalizedString;

  public static VertexIO: IOType;
  public readonly selectionProperty: TProperty<Vertex | CircuitElement | null>;

  public constructor( position: Vector2, selectionProperty: TProperty<CircuitElement | Vertex | null>, providedOptions?: VertexOptions ) {

    const options = optionize<VertexOptions, SelfOptions, PhetioObjectOptions>()( {
      draggable: true, // whether the vertex can be dragged, false for Black Box elements
      attachable: true, // Black box interior elements cannot be connected while the box is closed
      interactive: true, // Black box interface vertices can be interactive (tap to select) without being draggable
      blackBoxInterface: false, // Black box interface vertices cannot be dragged or deleted, but can be connected to
      insideTrueBlackBox: false, // Behavior differs in explore vs test mode
      tandem: Tandem.OPTIONAL, // Temporary vertices (for icons) should not be instrumented since they
      phetioDynamicElement: true
      // are more of an implementation detail rather than a feature
    }, providedOptions );

    super( options );

    this.index = counter++;

    this.selectionProperty = selectionProperty;

    this.vertexTandem = options.tandem;

    this.positionProperty = new Vector2Property( position, {
      tandem: options.tandem && options.tandem.createTandem( 'positionProperty' ),
      useDeepEquality: true,
      isValidValue: ( position: Vector2 ) => position.isFinite(),
      phetioReadOnly: true
    } );

    this.unsnappedPositionProperty = new Vector2Property( position, {
      isValidValue: ( position: Vector2 ) => position.isFinite()
    } );

    this.voltageProperty = new NumberProperty( 0, {
      tandem: options.tandem && options.tandem.createTandem( 'voltageProperty' ),
      units: 'V',
      phetioReadOnly: true,
      phetioHighFrequency: true
    } );

    this.isDraggableProperty = new BooleanProperty( options.draggable, {
      tandem: options.tandem && options.tandem.createTandem( 'isDraggableProperty' )
    } );

    this.interactiveProperty = new BooleanProperty( options.interactive );
    this.attachableProperty = new BooleanProperty( options.attachable );
    this.blackBoxInterfaceProperty = new BooleanProperty( options.blackBoxInterface );
    this.insideTrueBlackBoxProperty = new BooleanProperty( options.insideTrueBlackBox );
    this.relayerEmitter = new Emitter();
    this.vertexSelectedPropertyListener = null;
    this.isDragged = false;
    this.outerWireStub = false;

    this.isCuttableProperty = new BooleanProperty( true, {
      tandem: options.tandem.createTandem( 'isCuttableProperty' )
    } );

    this.localizedString = new LocalizedString( '', options.tandem.createTandem( 'labelTextProperty' ) );
    this.labelTextProperty = this.localizedString.property;
  }

  /**
   * Called when vertices are cut.
   */
  public setPosition( position: Vector2 ): void {
    this.positionProperty.set( position );
    this.unsnappedPositionProperty.set( position );
  }

  /**
   * Dispose of this and PhET-iO instrumented children, so they will be unregistered.
   */
  public override dispose(): void {
    this.positionProperty.dispose();
    this.voltageProperty.dispose();
    this.isDraggableProperty.dispose();
    this.isCuttableProperty.dispose();
    this.localizedString.dispose();
    super.dispose();
  }

  public isSelected(): boolean {
    return this.selectionProperty.value === this;
  }
}

type VertexState = {
  position: Vector2;
};

// {IOType}
Vertex.VertexIO = new IOType<Vertex, VertexState>( 'VertexIO', {
  valueType: Vertex,
  toStateObject: ( vertex: Vertex ) => ( { position: Vector2.Vector2IO.toStateObject( vertex.positionProperty.value ) } ),
  stateToArgsForConstructor: ( stateObject: VertexState ) => [ Vector2.Vector2IO.fromStateObject( stateObject.position ) ],
  stateSchema: {
    position: Vector2.Vector2IO
  }
} );

circuitConstructionKitCommon.register( 'Vertex', Vertex );