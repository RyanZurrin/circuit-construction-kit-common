// Copyright 2016, University of Colorado Boulder
// TODO: Review, document, annotate, i18n, bring up to standards

/**
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var circuitConstructionKitCommon = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/circuitConstructionKitCommon' );
  var Image = require( 'SCENERY/nodes/Image' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Util = require( 'DOT/Util' );
  var ProbeTextNode = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/ProbeTextNode' );
  var ProbeWireNode = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/ProbeWireNode' );
  var DerivedProperty = require( 'AXON/DerivedProperty' );
  var Vector2 = require( 'DOT/Vector2' );
  var CircuitConstructionKitConstants = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/CircuitConstructionKitConstants' );
  var BooleanProperty = require( 'AXON/BooleanProperty' );
  var TandemSimpleDragHandler = require( 'TANDEM/scenery/input/TandemSimpleDragHandler' );

  // images
  var voltmeterBodyImage = require( 'mipmap!CIRCUIT_CONSTRUCTION_KIT_COMMON/voltmeter_body.png' );
  var redProbe = require( 'mipmap!CIRCUIT_CONSTRUCTION_KIT_COMMON/probe_red.png' );
  var blackProbe = require( 'mipmap!CIRCUIT_CONSTRUCTION_KIT_COMMON/probe_black.png' );

  // constants

  // measurements for the cubic curve for the wire nodes
  var BODY_WIRE_LEAD_X = 45;
  var BODY_LEAD_Y = 15;
  var PROBE_LEAD_X = 0;
  var PROBE_LEAD_Y = 40;

  // unsigned measurements for the circles on the voltmeter body image, for where the probe wires connect
  var PROBE_CONNECTION_POINT_DY = -18;
  var PROBE_CONNECTION_POINT_DX = 8;

  /**
   * @param {Voltmeter|Meter} voltmeter - noting the parent type satisfies the IDEA parser
   * @param {Tandem} tandem
   * @param {Object} [options]
   * @constructor
   */
  function VoltmeterNode( voltmeter, tandem, options ) {
    var self = this;
    options = _.extend( {
      icon: false,
      visibleBoundsProperty: null,
      runningProperty: new BooleanProperty( true )
    }, options );
    this.voltmeter = voltmeter;
    var s = 0.5;
    this.redProbeNode = new Image( redProbe, { scale: 0.67 * s, cursor: 'pointer' } );
    this.blackProbeNode = new Image( blackProbe, { scale: 0.67 * s, cursor: 'pointer' } );

    var voltageReadoutProperty = new DerivedProperty( [ voltmeter.voltageProperty ], function( voltage ) {
      return voltage === null ? '?' : Util.toFixed( voltage, 2 ) + ' V';
    } );
    var probeTextNode = new ProbeTextNode( voltageReadoutProperty, options.runningProperty, 'Voltage', tandem.createTandem( 'probeTextNode' ), {
      centerX: voltmeterBodyImage[ 0 ].width / 2,
      centerY: voltmeterBodyImage[ 0 ].height / 2
    } );

    var bodyNode = new Image( voltmeterBodyImage, {
      scale: s, cursor: 'pointer', children: [
        probeTextNode
      ]
    } );

    var redWireNode = new ProbeWireNode( 'red', new Vector2( -BODY_WIRE_LEAD_X, BODY_LEAD_Y ), new Vector2( PROBE_LEAD_X, PROBE_LEAD_Y ) );
    var blackWireNode = new ProbeWireNode( 'black', new Vector2( BODY_WIRE_LEAD_X, BODY_LEAD_Y ), new Vector2( PROBE_LEAD_X, PROBE_LEAD_Y ) );

    voltmeter.bodyPositionProperty.link( function( bodyPosition ) {
      bodyNode.centerTop = bodyPosition;
      redWireNode.setBodyPosition( bodyNode.centerBottom.plusXY( -PROBE_CONNECTION_POINT_DX, PROBE_CONNECTION_POINT_DY ) );
      blackWireNode.setBodyPosition( bodyNode.centerBottom.plusXY( PROBE_CONNECTION_POINT_DX, PROBE_CONNECTION_POINT_DY ) );
    } );

    voltmeter.redProbePositionProperty.link( function( redProbePosition ) {
      self.redProbeNode.centerTop = redProbePosition;
      redWireNode.setProbePosition( self.redProbeNode.centerBottom );
    } );

    voltmeter.blackProbePositionProperty.link( function( blackProbePosition ) {
      self.blackProbeNode.centerTop = blackProbePosition;
      blackWireNode.setProbePosition( self.blackProbeNode.centerBottom );
    } );

    voltmeter.bodyPositionProperty.link( function( bodyPosition ) {
      if ( voltmeter.draggingProbesWithBodyProperty.get() ) {
        voltmeter.redProbePositionProperty.set( bodyPosition.plusXY( -100, -30 ) );
        voltmeter.blackProbePositionProperty.set( bodyPosition.plusXY( 100, -30 ) );
      }
    } );

    Node.call( this, {
      pickable: true,
      children: [
        bodyNode,
        redWireNode,
        this.redProbeNode,

        blackWireNode,
        this.blackProbeNode
      ]
    } );
    if ( !options.icon ) {
      this.dragHandler = new TandemSimpleDragHandler( {
        tandem: tandem.createTandem( 'dragHandler' ),
        start: function() {},
        drag: function( event ) {
          var pt = self.globalToParentPoint( event.pointer.point );
          pt = options.visibleBoundsProperty.value.eroded( CircuitConstructionKitConstants.DRAG_BOUNDS_EROSION ).closestPointTo( pt );
          voltmeter.bodyPositionProperty.set( pt );
        },
        end: function() {
          voltmeter.droppedEmitter.emit1( bodyNode.globalBounds );

          // After dropping in the play area the probes move independently of the body
          voltmeter.draggingProbesWithBodyProperty.set( false );
        }
      } );
      bodyNode.addInputListener( this.dragHandler );
      var redProbeDragHandler = new TandemSimpleDragHandler( {
        tandem: tandem.createTandem( 'redProbeDragHandler' ),
        start: function() {},
        drag: function( event ) {

          // TODO: duplicated
          var pt = self.globalToParentPoint( event.pointer.point );
          pt = options.visibleBoundsProperty.value.eroded( CircuitConstructionKitConstants.DRAG_BOUNDS_EROSION ).closestPointTo( pt );
          voltmeter.redProbePositionProperty.set( pt );
        },
        end: function() {}
      } );
      this.redProbeNode.addInputListener( redProbeDragHandler );
      var blackProbeDragHandler = new TandemSimpleDragHandler( {
        tandem: tandem.createTandem( 'blackProbeDragHandler' ),
        drag: function( event ) {

          // TODO: duplicated
          var pt = self.globalToParentPoint( event.pointer.point );
          pt = options.visibleBoundsProperty.value.eroded( CircuitConstructionKitConstants.DRAG_BOUNDS_EROSION ).closestPointTo( pt );
          voltmeter.blackProbePositionProperty.set( pt );
        },
      } );
      this.blackProbeNode.addInputListener( blackProbeDragHandler );
    }
  }

  circuitConstructionKitCommon.register( 'VoltmeterNode', VoltmeterNode );

  return inherit( Node, VoltmeterNode, {} );
} );