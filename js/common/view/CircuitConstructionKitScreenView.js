// Copyright 2015-2016, University of Colorado Boulder
// TODO: Review, document, annotate, i18n, bring up to standards

/**
 * Node that represents a single scene or screen, with a circuit, toolbox, sensors, etc.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var circuitConstructionKitCommon = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/circuitConstructionKitCommon' );
  var DisplayOptionsPanel = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/DisplayOptionsPanel' );
  var BooleanProperty = require( 'AXON/BooleanProperty' );
  var inherit = require( 'PHET_CORE/inherit' );
  var ScreenView = require( 'JOIST/ScreenView' );
  var CircuitNode = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/CircuitNode' );
  var CircuitElementToolbox = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/CircuitElementToolbox' );
  var CircuitElementEditContainerPanel = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/CircuitElementEditContainerPanel' );
  var ElectronSpeedThrottlingReadoutNode = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/ElectronSpeedThrottlingReadoutNode' );
  var SensorToolbox = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/SensorToolbox' );
  var VoltmeterNode = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/VoltmeterNode' );
  var AmmeterNode = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/AmmeterNode' );
  var CircuitConstructionKitConstants = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/CircuitConstructionKitConstants' );
  var Util = require( 'DOT/Util' );
  var ResetAllButton = require( 'SCENERY_PHET/buttons/ResetAllButton' );
  var CircuitConstructionKitQueryParameters = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/CircuitConstructionKitQueryParameters' );
  var PlayPauseButton = require( 'SCENERY_PHET/buttons/PlayPauseButton' );
  var TextPushButton = require( 'SUN/buttons/TextPushButton' );
  var CircuitStruct = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/CircuitStruct' );
  var Plane = require( 'SCENERY/nodes/Plane' );
  var ViewRadioButtonGroup = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/ViewRadioButtonGroup' );
  var ZoomControlPanel = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/view/ZoomControlPanel' );

  // constants
  var LAYOUT_INSET = CircuitConstructionKitConstants.LAYOUT_INSET;
  var BACKGROUND_COLOR = CircuitConstructionKitConstants.BACKGROUND_COLOR;

  /**
   * @param {CircuitConstructionKitModel} circuitConstructionKitModel
   * @param {Tandem} tandem
   * @param {Object} [options]
   * @constructor
   */
  function CircuitConstructionKitScreenView( circuitConstructionKitModel, tandem, options ) {
    var self = this;
    this.circuitConstructionKitModel = circuitConstructionKitModel;

    options = _.extend( {

      // When used as a scene, the reset all button is suppressed here, added in the screen
      // so that it may reset all scenes (including but not limited to this one).
      showResetAllButton: false,
      toolboxOrientation: 'vertical',
      numberOfRightBatteriesInToolbox: CircuitElementToolbox.NUMBER_OF_RIGHT_BATTERIES,
      numberOfLeftBatteriesInToolbox: CircuitElementToolbox.NUMBER_OF_LEFT_BATTERIES,
      numberOfWiresInToolbox: CircuitElementToolbox.NUMBER_OF_WIRES,
      numberOfLightBulbsInToolbox: CircuitElementToolbox.NUMBER_OF_LIGHT_BULBS,
      numberOfResistorsInToolbox: CircuitElementToolbox.NUMBER_OF_RESISTORS,
      getToolboxPosition: function( visibleBounds ) {
        return {
          left: visibleBounds.left + LAYOUT_INSET,
          top: visibleBounds.top + LAYOUT_INSET
        };
      },
      getCircuitEditPanelLayoutPosition: CircuitElementEditContainerPanel.GET_LAYOUT_POSITION
    }, options );
    this.circuitConstructionKitModel = circuitConstructionKitModel;
    ScreenView.call( this );

    // On touch, make it so tapping the background deselects items.  For mouse, we add listeners to the pointer that
    // work a bit more accurately.
    // @protected, so subclasses can change the fill
    this.backgroundPlane = new Plane( { fill: BACKGROUND_COLOR } );
    this.backgroundPlane.addInputListener( {
      touchdown: function() {
        circuitConstructionKitModel.circuit.selectedCircuitElementProperty.set( null );
        circuitConstructionKitModel.circuit.vertices.forEach( function( v ) {
          v.selected = false;
        } );
      }
    } );
    this.addChild( this.backgroundPlane );
    var backgroundListener = function( exploreScreenRunning ) {
      self.backgroundPlane.fill = exploreScreenRunning ? BACKGROUND_COLOR : 'gray';
    };
    circuitConstructionKitModel.exploreScreenRunningProperty.link( backgroundListener );

    // For overriding in BlackBoxSceneView, which needs a custom color
    this.unlinkBackgroundListener = function() {
      circuitConstructionKitModel.exploreScreenRunningProperty.unlink( backgroundListener );
    };

    // Reset All button
    if ( options.showResetAllButton ) {
      var resetAllButton = new ResetAllButton( {
        tandem: tandem.createTandem( 'resetAllButton' ),
        listener: function() {
          circuitConstructionKitModel.reset();
          self.reset();
        }
      } );
      this.addChild( resetAllButton );
    }

    // TODO: A better place to implement this?
    if ( CircuitConstructionKitQueryParameters.circuit ) {
      var circuitStateObject = JSON.parse( LZString.decompressFromEncodedURIComponent( CircuitConstructionKitQueryParameters.circuit ) );
      circuitConstructionKitModel.circuit.loadFromCircuitStruct( CircuitStruct.fromStateObject( circuitStateObject ) );
    }

    var enableSave = true;
    window.onpopstate = function( e ) {
      if ( e.state && e.state.circuit ) {
        var circuit = e.state.circuit;
        enableSave = false;
        console.log( 'loading from pop state' );
        circuitConstructionKitModel.circuit.loadFromCircuitStruct( CircuitStruct.fromStateObject( circuit ) );
        enableSave = true;
      }
    };

    var pushState = function() {
      if ( !enableSave ) {
        return;
      }
      console.log( 'push state' );
      var stateObject = circuitConstructionKitModel.circuit.toStateObject();
      var string = JSON.stringify( stateObject );
      var compressed = LZString.compressToEncodedURIComponent( string );
      console.log( string.length, ' => ', compressed.length );

      // assume circuit query parameter is last
      var text = window.location.href;
      if ( text.indexOf( '?circuit=' ) >= 0 ) {
        text = text.substring( 0, text.indexOf( '?circuit=' ) );
      }
      else if ( text.indexOf( '&circuit=' ) >= 0 ) {
        text = text.substring( 0, text.indexOf( '&circuit=' ) );
      }

      var join = text.indexOf( '?' ) >= 0 ? '&' : '?';

      window.history.pushState( { circuit: stateObject }, 'title', text + join + 'circuit=' + compressed );
    };

    if ( CircuitConstructionKitQueryParameters.showSaveButton ) {
      var saveButton = new TextPushButton( 'Save', {
        listener: pushState
      } );
      this.addChild( saveButton );
    }

    var voltmeterNode = new VoltmeterNode( circuitConstructionKitModel.voltmeter, tandem.createTandem( 'voltmeterNode' ), {
      runningProperty: circuitConstructionKitModel.exploreScreenRunningProperty,
      visibleBoundsProperty: this.visibleBoundsProperty
    } );
    circuitConstructionKitModel.voltmeter.droppedEmitter.addListener( function( bodyNodeGlobalBounds ) {
      if ( bodyNodeGlobalBounds.intersectsBounds( self.sensorToolbox.globalBounds ) ) {
        circuitConstructionKitModel.voltmeter.visibleProperty.set( false );
      }
    } );
    circuitConstructionKitModel.voltmeter.visibleProperty.link( function( visible ) {
      voltmeterNode.visible = visible;
    } );

    var ammeterNode = new AmmeterNode( circuitConstructionKitModel.ammeter, tandem.createTandem( 'ammeterNode' ), {
      visibleBoundsProperty: this.visibleBoundsProperty,
      runningProperty: circuitConstructionKitModel.exploreScreenRunningProperty
    } );
    circuitConstructionKitModel.ammeter.droppedEmitter.addListener( function( bodyNodeGlobalBounds ) {
      if ( bodyNodeGlobalBounds.intersectsBounds( self.sensorToolbox.globalBounds ) ) {
        circuitConstructionKitModel.ammeter.visibleProperty.set( false );
      }
    } );
    circuitConstructionKitModel.ammeter.visibleProperty.link( function( visible ) {
      ammeterNode.visible = visible;
    } );

    // Pass the view into circuit node so that circuit elements can be dropped back into the toolbox
    this.circuitNode = new CircuitNode( circuitConstructionKitModel.circuit, this, tandem.createTandem( 'circuitNode' ) );
    this.circuitElementToolbox = new CircuitElementToolbox(
      circuitConstructionKitModel.circuit,
      circuitConstructionKitModel.showLabelsProperty,
      this.circuitNode,
      tandem.createTandem( 'circuitElementToolbox' ), {
        orientation: options.toolboxOrientation,
        numberOfRightBatteries: options.numberOfRightBatteriesInToolbox,
        numberOfLeftBatteries: options.numberOfLeftBatteriesInToolbox,
        numberOfWires: options.numberOfWiresInToolbox,
        numberOfSwitches: options.numberOfSwitchesInToolbox,
        numberOfLightBulbs: options.numberOfLightBulbsInToolbox,
        numberOfResistors: options.numberOfResistorsInToolbox
      } );

    var electronSpeedThrottlingReadoutNode = new ElectronSpeedThrottlingReadoutNode(
      circuitConstructionKitModel.circuit.electronPropagator.timeScaleProperty,
      circuitConstructionKitModel.circuit.showCurrentProperty,
      circuitConstructionKitModel.exploreScreenRunningProperty
    );
    this.addChild( electronSpeedThrottlingReadoutNode );

    // @protected - so that subclasses can add a layout circuit element near it
    this.sensorToolbox = new SensorToolbox( voltmeterNode, ammeterNode, circuitConstructionKitModel.exploreScreenRunningProperty, tandem.createTandem( 'sensorToolbox' ) );

    // @private
    this.viewRadioButtonGroup = new ViewRadioButtonGroup( circuitConstructionKitModel.viewProperty );
    this.viewRadioButtonGroup.setScaleMagnitude( this.sensorToolbox.width / this.viewRadioButtonGroup.width );

    // @protected
    this.displayOptionsPanel = new DisplayOptionsPanel(
      circuitConstructionKitModel.circuit.showCurrentProperty,
      circuitConstructionKitModel.circuit.currentTypeProperty,
      new BooleanProperty( false ),
      circuitConstructionKitModel.showLabelsProperty,
      tandem.createTandem( 'displayOptionsPanel' ), {
        showValuesCheckBox: false,
        showElectronsCheckBox: CircuitConstructionKitQueryParameters.showElectronsCheckBox
      } );

    CircuitConstructionKitQueryParameters.showControlPanel && this.addChild( this.displayOptionsPanel );

    this.displayOptionsPanel.moveToBack(); // Move behind elements added in the super, such as the sensors and circuit
    this.moveBackgroundToBack();

    this.addChild( this.circuitElementToolbox );

    this.addChild( this.circuitNode );
    this.addChild( this.sensorToolbox );

    this.addChild( this.viewRadioButtonGroup );

    var circuitElementEditContainerPanel = new CircuitElementEditContainerPanel(
      circuitConstructionKitModel.circuit,
      this.visibleBoundsProperty,
      options.getCircuitEditPanelLayoutPosition,
      circuitConstructionKitModel.modeProperty,
      tandem.createTandem( 'circuitElementEditContainerPanel' )
    );

    // @protected - so the subclass can set the layout
    this.circuitElementEditContainerPanel = circuitElementEditContainerPanel;

    this.addChild( circuitElementEditContainerPanel );

    this.addChild( voltmeterNode );
    this.addChild( ammeterNode );

    // Detection for voltmeter probe + circuit collision is done in the view since view bounds are used
    var updateVoltmeter = function() {
      if ( circuitConstructionKitModel.voltmeter.visibleProperty.get() ) {
        var redConnection = self.getVoltageConnection( voltmeterNode.redProbeNode, voltmeterNode.voltmeter.redProbePositionProperty.get() );
        var blackConnection = self.getVoltageConnection( voltmeterNode.blackProbeNode, voltmeterNode.voltmeter.blackProbePositionProperty.get() );
        if ( redConnection === null || blackConnection === null ) {
          circuitConstructionKitModel.voltmeter.voltageProperty.set( null );
        }
        else if ( !circuitConstructionKitModel.circuit.areVerticesConnected( redConnection.vertex, blackConnection.vertex ) ) {

          // Voltmeter probes each hit things but they were not connected to each other through the circuit.
          circuitConstructionKitModel.voltmeter.voltageProperty.set( null );
        }
        else if ( redConnection !== null && redConnection.vertex.insideTrueBlackBoxProperty.get() && !circuitConstructionKitModel.revealingProperty.get() ) {

          // Cannot read values inside the black box, unless "reveal" is being pressed
          circuitConstructionKitModel.voltmeter.voltageProperty.set( null );
        }
        else if ( blackConnection !== null && blackConnection.vertex.insideTrueBlackBoxProperty.get() && !circuitConstructionKitModel.revealingProperty.get() ) {

          // Cannot read values inside the black box, unless "reveal" is being pressed
          circuitConstructionKitModel.voltmeter.voltageProperty.set( null );
        }
        else {
          circuitConstructionKitModel.voltmeter.voltageProperty.set( redConnection.voltage - blackConnection.voltage );
        }
      }
    };
    circuitConstructionKitModel.circuit.circuitChangedEmitter.addListener( updateVoltmeter );
    circuitConstructionKitModel.voltmeter.redProbePositionProperty.link( updateVoltmeter );
    circuitConstructionKitModel.voltmeter.blackProbePositionProperty.link( updateVoltmeter );

    // Detection for ammeter probe + circuit collision is done in the view since view bounds are used
    var updateAmmeter = function() {

      // Skip work when ammeter is not out, to improve performance.
      if ( circuitConstructionKitModel.ammeter.visibleProperty.get() ) {
        var current = self.getCurrent( ammeterNode.probeNode );
        circuitConstructionKitModel.ammeter.currentProperty.set( current );
      }
    };
    circuitConstructionKitModel.circuit.circuitChangedEmitter.addListener( updateAmmeter );
    circuitConstructionKitModel.ammeter.probePositionProperty.link( updateAmmeter );

    // TODO: Move to a separate file
    if ( CircuitConstructionKitQueryParameters.showPlayPauseButton ) {
      var playPauseButton = new PlayPauseButton( circuitConstructionKitModel.exploreScreenRunningProperty, {
        tandem: tandem.createTandem( 'playPauseButton' ),
        baseColor: '#33ff44' // the default blue fades into the background too much
      } );
      this.addChild( playPauseButton );
      this.visibleBoundsProperty.link( function( visibleBounds ) {

        // Float the playPauseButton to the bottom left
        playPauseButton.mutate( {
          left: visibleBounds.left + LAYOUT_INSET,
          bottom: visibleBounds.bottom - LAYOUT_INSET
        } );
      } );
    }

    // Create the zoom control panel
    var zoomControlPanel = new ZoomControlPanel( circuitConstructionKitModel.zoomLevelProperty );

    // Make it as wide as the circuit element toolbox
    zoomControlPanel.setScaleMagnitude( this.circuitElementToolbox.width / zoomControlPanel.width );

    // Add it in front of everything (should never be obscured by a CircuitElement)
    this.addChild( zoomControlPanel );

    this.visibleBoundsProperty.link( function( visibleBounds ) {

      // Float the resetAllButton to the bottom right
      if ( options.showResetAllButton ) {
        resetAllButton.mutate( {
          right: visibleBounds.right - LAYOUT_INSET,
          bottom: visibleBounds.bottom - LAYOUT_INSET
        } );
      }

      if ( CircuitConstructionKitQueryParameters.showSaveButton ) {
        saveButton.mutate( {
          right: visibleBounds.right - LAYOUT_INSET,
          bottom: resetAllButton.top - LAYOUT_INSET
        } );
      }

      electronSpeedThrottlingReadoutNode.mutate( {
        centerX: visibleBounds.centerX,
        bottom: visibleBounds.bottom - 100 // so it doesn't overlap the component controls
      } );

      self.circuitElementToolbox.mutate( options.getToolboxPosition( visibleBounds ) );

      self.displayOptionsPanel.mutate( {
        right: visibleBounds.right - LAYOUT_INSET,
        top: visibleBounds.top + LAYOUT_INSET
      } );
      self.sensorToolbox.mutate( {
        right: visibleBounds.right - LAYOUT_INSET,
        top: self.displayOptionsPanel.bottom + LAYOUT_INSET
      } );
      self.viewRadioButtonGroup.top = self.sensorToolbox.bottom + 10;
      self.viewRadioButtonGroup.left = self.sensorToolbox.left;

      zoomControlPanel.bottom = visibleBounds.bottom - LAYOUT_INSET;
      zoomControlPanel.left = self.circuitElementToolbox.left;
    } );

    // Center the circuit node so that zooms will remain centered.
    self.circuitNode.setTranslation( self.layoutBounds.centerX, self.layoutBounds.centerY );

    // TODO: replace this with a continuous zoom in out animation, probably in step()
    circuitConstructionKitModel.zoomLevelProperty.link( function( zoomLevel ) {
      self.circuitNode.setScaleMagnitude( zoomLevel );
    } );
  }

  circuitConstructionKitCommon.register( 'CircuitConstructionKitScreenView', CircuitConstructionKitScreenView );

  return inherit( ScreenView, CircuitConstructionKitScreenView, {

    /**
     * When other UI components are moved to the back, we must make sure the background stays behind them.
     * @public
     */
    moveBackgroundToBack: function() {
      this.backgroundPlane.moveToBack();
    },
    step: function( dt ) {
      this.circuitNode.step( dt );
    },
    //overrideable stub
    reset: function() {

    },
    canNodeDropInToolbox: function( circuitElementNode ) {
      var isSingle = this.circuitConstructionKitModel.circuit.isSingle( circuitElementNode.circuitElement );
      var inBounds = this.circuitElementToolbox.globalBounds.containsPoint( circuitElementNode.globalBounds.center );
      var okToDrop = circuitElementNode.circuitElement.canBeDroppedInToolbox;
      return isSingle && inBounds && okToDrop;
    },

    dropCircuitElementNodeInToolbox: function( circuitElementNode ) {

      // Only drop in the box if it was a single component, if connected to other things, do not
      this.circuitConstructionKitModel.circuit.remove( circuitElementNode.circuitElement );
    },

    /**
     * Find where the voltmeter probe node intersects the wire, for computing the voltage difference
     * @param {Node} probeNode
     * @private
     */
    getCurrent: function( probeNode ) {

      var hitWireNode = this.hitWireNode( probeNode, 'translation' );
      if ( hitWireNode ) {
        return hitWireNode.wire.currentProperty.get();
      }
      else {
        return null;
      }
    },

    /**
     * Check for an intersection between a probeNode and a wire, return null if no hits.
     * @param probeNode
     * @param {string} locationString - 'translation' for ammeter or 'centerTop' for voltmeter probes
     * @returns {*}
     */
    hitWireNode: function( probeNode, locationString ) {

      // Search from the front to the back, because frontmost objects look like they are hitting the sensor, see #143
      for ( var i = this.circuitNode.wireNodes.length - 1; i >= 0; i-- ) {
        var wireNode = this.circuitNode.wireNodes[ i ];

        // Don't connect to wires in the black box
        var revealing = true;
        var trueBlackBox = wireNode.wire.insideTrueBlackBoxProperty.get();
        if ( trueBlackBox ) {
          revealing = this.circuitConstructionKitModel.revealingProperty.get();
        }
        if ( revealing && wireNode.getStrokedShape().containsPoint( probeNode[ locationString ] ) ) {
          return wireNode;
        }
      }
      return null;
    },

    /**
     * Find where the voltmeter probe node intersects the wire, for computing the voltage difference
     * @param {Image} probeNode - the probe node from the VoltmeterNode
     * @param {Vector2} probePosition
     * @private
     * @return {Object} with vertex (for checking connectivity) and voltage (if connected)
     */
    getVoltageConnection: function( probeNode, probePosition ) {

      // Check for intersection with a vertex
      for ( var i = 0; i < this.circuitNode.vertexNodes.length; i++ ) {
        var vertexNode = this.circuitNode.vertexNodes[ i ];
        var position = vertexNode.vertex.positionProperty.get();
        var radius = vertexNode.dottedLineNodeRadius;

        var distance = probePosition.distance( position );
        if ( distance <= radius ) {
          return {
            vertex: vertexNode.vertex,
            voltage: vertexNode.vertex.voltageProperty.get()
          };
        }
      }

      // Check for intersection with a wire
      var wireNode = this.hitWireNode( probeNode, 'centerTop' );
      if ( wireNode ) {

        var startPoint = wireNode.wire.startVertexProperty.get().positionProperty.get();
        var endPoint = wireNode.wire.endVertexProperty.get().positionProperty.get();
        var segmentVector = endPoint.minus( startPoint );
        var probeVector = probeNode.centerTop.minus( startPoint );

        var distanceAlongSegment = probeVector.dot( segmentVector ) / segmentVector.magnitude() / segmentVector.magnitude();
        distanceAlongSegment = Util.clamp( distanceAlongSegment, 0, 1 );

        assert && assert( distanceAlongSegment >= 0 && distanceAlongSegment <= 1, 'beyond the end of the wire' );
        var voltageAlongWire = Util.linear( 0, 1, wireNode.wire.startVertexProperty.get().voltageProperty.get(), wireNode.wire.endVertexProperty.get().voltageProperty.get(), distanceAlongSegment );

        return {
          vertex: wireNode.wire.startVertexProperty.get(),
          voltage: voltageAlongWire
        };
      }
      else {
        return null;
      }
    }
  } );
} );