// Copyright 2015-2016, University of Colorado Boulder
// TODO: Review, document, annotate, i18n, bring up to standards

/**
 * A collection of circuit elements in the play area, not necessarily connected.  (For instance it could be 2 disjoint
 * circuits).
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var circuitConstructionKitCommon = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/circuitConstructionKitCommon' );
  var inherit = require( 'PHET_CORE/inherit' );
  var ObservableArray = require( 'AXON/ObservableArray' );
  var ModifiedNodalAnalysisCircuit = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/ModifiedNodalAnalysisCircuit' );
  var Property = require( 'AXON/Property' );
  var Emitter = require( 'AXON/Emitter' );
  var Vertex = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/Vertex' );
  var Wire = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/Wire' );
  var Battery = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/Battery' );
  var LightBulb = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/LightBulb' );
  var Switch = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/Switch' );
  var Resistor = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/Resistor' );
  var ElectronLayout = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/ElectronLayout' );
  var ElectronPropagator = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/ElectronPropagator' );
  var Vector2 = require( 'DOT/Vector2' );
  var FixedLengthCircuitElement = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/FixedLengthCircuitElement' );

  // phet-io modules
  var TBoolean = require( 'ifphetio!PHET_IO/types/TBoolean' );

  // constants
  var SNAP_RADIUS = 30; // For two vertices to join together, they must be this close, in view coordinates

  /**
   * @param {Tandem} tandem
   * @constructor
   */
  function Circuit( tandem ) {
    var self = this;

    // @public - The different types of CircuitElement the circuit may contain, including Wire, Battery, Switch, Resistor,
    // LightBulb.
    this.circuitElements = new ObservableArray();

    // Keep track of which terminals are connected to other terminals.  The vertices are also referenced in the
    // CircuitElements above--this ObservableArray is a a central point for observing creation/deletion of vertices for
    // showing VertexNodes
    // @public (read-only)
    this.vertices = new ObservableArray(); // TODO: can/should we eliminate this redundancy?

    // @public (read-only) - the electrons in the circuit
    this.electrons = new ObservableArray();

    // @public (read-only) - whether the electrons should be displayed
    this.showElectronsProperty = new Property( false, {
      tandem: tandem.createTandem( 'showElectronsProperty' ),
      phetioValueType: TBoolean
    } );

    // @private - create the electrons in new circuits
    this.constantDensityLayout = new ElectronLayout( this );

    // @private - move the electrons with speed proportional to current
    this.constantDensityPropagator = new ElectronPropagator( this );

    // Re-solve the circuit when voltages or resistances change.
    var solve = function() { self.solve(); };

    // Solve the circuit when any of the circuit element attributes change.
    this.circuitElements.addItemAddedListener( function( circuitElement ) {
      circuitElement.resistanceProperty && circuitElement.resistanceProperty.lazyLink( solve );
      circuitElement.voltageProperty && circuitElement.voltageProperty.lazyLink( solve )
    } );
    this.circuitElements.addItemRemovedListener( function( circuitElement ) {
      circuitElement.resistanceProperty && circuitElement.resistanceProperty.unlink( solve );
      circuitElement.voltageProperty && circuitElement.voltageProperty.unlink( solve )
    } );

    // @public - whether any circuit element is over the toolbox.  This shows the toolbox highlight when something
    // can be dropped in.
    this.isCircuitElementOverToolboxProperty = new Property( false );
    var detectOverToolbox = function() {
      var circuitElements = self.circuitElementArray;
      for ( var i = 0; i < circuitElements.length; i++ ) {
        var element = circuitElements[ i ];
        if ( element.isOverToolboxProperty.get() ) {
          self.isCircuitElementOverToolboxProperty.set( true );
          return;
        }
      }
      self.isCircuitElementOverToolboxProperty.set( false );
    };
    this.circuitElements.addItemAddedListener( function( circuitElement ) {
      circuitElement.isOverToolboxProperty.link( detectOverToolbox );
    } );
    this.circuitElements.addItemRemovedListener( function( circuitElement ) {
      circuitElement.isOverToolboxProperty.unlink( detectOverToolbox );
      detectOverToolbox();
    } );

    // When a new circuit element is added to a circuit, it has two unconnected vertices
    var addVertices = function( circuitElement ) {

      // Vertices may already exist for a Circuit when loading
      if ( self.vertices.indexOf( circuitElement.startVertexProperty.get() ) < 0 ) {
        self.vertices.add( circuitElement.startVertexProperty.get() );
      }

      if ( self.vertices.indexOf( circuitElement.endVertexProperty.get() ) < 0 ) {
        self.vertices.add( circuitElement.endVertexProperty.get() );
      }

      assert && assert( self.vertices.indexOf( circuitElement.startVertexProperty.get() ) >= 0, 'start vertex should appear in the list' );
      assert && assert( self.vertices.indexOf( circuitElement.endVertexProperty.get() ) >= 0, 'end vertex should appear in the list' );
      self.solve();
    };
    this.circuitElements.addItemAddedListener( addVertices );

    // When any vertex moves, relayout all electrons within the fixed-length connected component, see #100
    this.circuitElements.addItemAddedListener( function( circuitElement ) {
      circuitElement.electronLayoutDirty = true;

      var updateElectrons = function() {
        var circuitElements = self.findAllConnectedCircuitElements( circuitElement.startVertexProperty.get() );

        for ( var i = 0; i < circuitElements.length; i++ ) {
          circuitElements[ i ].electronLayoutDirty = true;
        }
      };
      circuitElement.vertexMovedEmitter.addListener( updateElectrons );
      circuitElement.moveToFrontEmitter.addListener( updateElectrons );
      self.componentAddedEmitter.emit();
    } );
    this.circuitElements.addItemRemovedListener( function( circuitElement ) {
      self.electrons.removeAll( self.getElectronsInCircuitElement( circuitElement ) );
      self.componentDeletedEmitter.emit();
      self.solve(); // Explicit call to solve since it is possible to remove a CircuitElement without removing any vertices.
    } );

    // When electron is removed from the list, dispose it
    this.electrons.addItemRemovedListener( function( electron ) {
      electron.dispose();
    } );

    // After the circuit physics is recomputed in solve(), some listeners need to update themselves, such as
    // the voltmeter and ammeter
    this.circuitChangedEmitter = new Emitter();

    // Some actions only take place after an item has been dropped
    this.vertexDroppedEmitter = new Emitter();

    // Pass-through events
    this.componentEditedEmitter = new Emitter();

    this.componentDeletedEmitter = new Emitter();
    this.componentAddedEmitter = new Emitter();

    var circuitChangedEmitterFunction = function() {
      self.circuitChangedEmitter.emit();
    };
    self.vertices.addItemAddedListener( function( vertex ) {

      // Observe the change in location of the vertices, to update the ammeter and voltmeter
      vertex.positionProperty.link( circuitChangedEmitterFunction );

      var filtered = self.vertices.filter( function( candidateVertex ) {
        return vertex === candidateVertex;
      } );
      assert && assert( filtered.length === 1, 'should only have one copy of each vertex' );
    } );

    // Stop watching the vertex positions for updating the voltmeter and ammeter
    self.vertices.addItemRemovedListener( function( vertex ) {
      assert && assert( vertex.positionProperty.hasListener( circuitChangedEmitterFunction ), 'should have had the listener' );
      vertex.positionProperty.unlink( circuitChangedEmitterFunction );
      assert && assert(
        !vertex.positionProperty.hasListener( circuitChangedEmitterFunction ),
        'Listener should have been removed'
      );
    } );

    // Keep track of the last circuit element the user manipulated, for showing additional controls
    this.selectedCircuitElementProperty = new Property( null );

    // When any vertex is dropped, check all vertices for intersection.  If any overlap, move them apart.
    this.vertexDroppedEmitter.addListener( function() {

      // TODO: schedule in the step() function or with phet timers
      setTimeout( function() {
        for ( var i = 0; i < self.vertices.length; i++ ) {
          var v1 = self.vertices.get( i );
          for ( var k = 0; k < self.vertices.length; k++ ) {
            var v2 = self.vertices.get( k );
            if ( i !== k ) {
              if ( v2.unsnappedPositionProperty.get().distance( v1.unsnappedPositionProperty.get() ) < 20 ) {
                self.moveVerticesApart( v1, v2 );
                return; // Don't handle the same pair twice  // TODO: perhaps cycle several times until reaching a stable state
              }
            }
          }
        }
      }, 100 );
    } );

    // @public - for creating vertex tandems
    this.vertexGroupTandem = tandem.createGroupTandem( 'vertices' );
  }

  circuitConstructionKitCommon.register( 'Circuit', Circuit );

  return inherit( Object, Circuit, {
    containsVertex: function( vertex ) {
      return this.vertices.indexOf( vertex ) >= 0;
    },

    // Two vertices were too close to each other, move them apart.
    moveVerticesApart: function( v1, v2 ) {

      // are they in the same fixed subgroup
      var v1Group = this.findAllFixedVertices( v1 );
      var MAKE_THE_NEXT_EXPRESSION_TRUE = true;
      if ( v1Group.indexOf( v2 ) >= 0 || MAKE_THE_NEXT_EXPRESSION_TRUE ) { // TODO: Treat wires the same as fixed length components here?

        var v1Neighbors = this.getNeighborVertices( v1 );
        var v2Neighbors = this.getNeighborVertices( v2 );

        if ( v1Neighbors.length === 1 && !v1.blackBoxInterfaceProperty.get() ) {
          this.rotateSingleVertex( v1, v1Neighbors[ 0 ] );
        }
        else if ( v2Neighbors.length === 1 && !v2.blackBoxInterfaceProperty.get() ) {
          this.rotateSingleVertex( v2, v2Neighbors[ 0 ] );
        }
        else {
          // TODO: rotate the entire group unless they have a fixed connection other than the pivot?
        }
      }
      else {
        // ok to translate
      }
    },
    get circuitElementArray() {
      return this.circuitElements.getArray();
    },

    // Rotate away from other vertices, not toward them.
    rotateSingleVertex: function( vertex, pivotVertex ) {
      var searchAngle = Math.PI / 4;
      this.rotateSingleVertexByAngle( vertex, pivotVertex, searchAngle );
      var distance1 = this.closestDistanceToOtherVertex( vertex );
      this.rotateSingleVertexByAngle( vertex, pivotVertex, -2 * searchAngle );
      var distance2 = this.closestDistanceToOtherVertex( vertex );
      if ( distance2 > distance1 ) {
        // keep it, we're good.
      }
      else {

        // go back to the best spot
        this.rotateSingleVertexByAngle( vertex, pivotVertex, 2 * searchAngle );
      }
    },

    rotateSingleVertexByAngle: function( vertex, pivotVertex, deltaAngle ) {
      var distanceFromVertex = vertex.positionProperty.get().distance( pivotVertex.positionProperty.get() );
      var angle = vertex.positionProperty.get().minus( pivotVertex.positionProperty.get() ).angle();

      var newPosition = pivotVertex.positionProperty.get().plus( Vector2.createPolar( distanceFromVertex, angle + deltaAngle ) );
      vertex.unsnappedPositionProperty.set( newPosition );
      vertex.positionProperty.set( newPosition );
    },

    closestDistanceToOtherVertex: function( vertex ) {
      var closestDistance = null;
      for ( var i = 0; i < this.vertices.length; i++ ) {
        var v = this.vertices.get( i );
        if ( v !== vertex ) {
          var distance = v.positionProperty.get().distance( vertex.positionProperty.get() );
          if ( closestDistance === null || distance < closestDistance ) {
            closestDistance = distance;
          }
        }
      }
      return closestDistance;
    },

    clear: function() {

      this.selectedCircuitElementProperty.reset();

      // Vertices must be cleared from the black box screen--it's not handled by clearing the circuit elements
      // TODO: Unify these implementations
      if ( window.phetBlackBoxStudy ) {

        // clear references, do not dispose because some items get added back in the black box.
        this.circuitElements.clear();

        this.vertices.clear();

        // Update the physics
        this.solve();
      }
      else {

        // Dispose of elements
        while ( this.circuitElements.length > 0 ) {
          this.remove( this.circuitElements.get( 0 ) );
        }
        assert && assert( this.vertices.length === 0, 'vertices should have been removed with circuit elements cleared' );
      }
    },

    /**
     * @param {Vertex} vertex
     */
    cutVertex: function( vertex ) {
      var neighborCircuitElements = this.getNeighborCircuitElements( vertex );
      if ( neighborCircuitElements.length === 0 ) {

        // No need to cut a solo vertex
        return;
      }
      for ( var i = 0; i < neighborCircuitElements.length; i++ ) {
        var circuitElement = neighborCircuitElements[ i ];
        if ( circuitElement.interactiveProperty.get() ) {
          var options = {
            draggable: true,
            interactive: true,
            attachable: true,
            blackBoxInterface: false,
            insideTrueBlackBox: false,
            tandem: this.vertexGroupTandem.createNextTandem()
          };
          var newVertex = new Vertex( vertex.positionProperty.get().x, vertex.positionProperty.get().y, options );

          // Add the new vertex to the model first so that it can be updated in subsequent calls
          this.vertices.add( newVertex );

          circuitElement.replaceVertex( vertex, newVertex );

          // Bump the vertices away from each other
          var vertexGroup = this.findAllFixedVertices( newVertex );
          var oppositeVertex = circuitElement.getOppositeVertex( newVertex );
          var translation = oppositeVertex.positionProperty.get().minus( newVertex.positionProperty.get() ).normalized().timesScalar( 30 );
          for ( var j = 0; j < vertexGroup.length; j++ ) {
            var v = vertexGroup[ j ];

            // Only translate vertices that are movable and not connected to the black box interface by fixed length elements
            if ( v.draggableProperty.get() && !this.hasFixedConnectionToBlackBoxInterfaceVertex( v ) ) {
              v.positionProperty.set( v.positionProperty.get().plus( translation ) );
              v.unsnappedPositionProperty.set( v.positionProperty.get() );
            }
          }
        }
      }

      if ( !vertex.blackBoxInterfaceProperty.get() ) {
        this.vertices.remove( vertex );
      }

      // Update the physics
      this.solve();
    },

    hasFixedConnectionToBlackBoxInterfaceVertex: function( v ) {
      var vertices = this.findAllFixedVertices( v );
      return _.filter( vertices, function( v ) {
          return v.blackBoxInterfaceProperty.get();
        } ).length > 0;
    },

    isSingle: function( circuitElement ) {
      return this.getNeighborCircuitElements( circuitElement.startVertexProperty.get() ).length === 1 &&
             this.getNeighborCircuitElements( circuitElement.endVertexProperty.get() ).length === 1;
    },

    /**
     * @param {CircuitElement} circuitElement
     */
    remove: function( circuitElement ) {
      this.circuitElements.remove( circuitElement );

      // Delete orphaned vertices
      if ( this.getNeighborCircuitElements( circuitElement.startVertexProperty.get() ).length === 0 && !circuitElement.startVertexProperty.get().blackBoxInterfaceProperty.get() ) {
        this.vertices.remove( circuitElement.startVertexProperty.get() );
      }

      if ( this.getNeighborCircuitElements( circuitElement.endVertexProperty.get() ).length === 0 && !circuitElement.endVertexProperty.get().blackBoxInterfaceProperty.get() ) {
        this.vertices.remove( circuitElement.endVertexProperty.get() );
      }

      circuitElement.dispose();

      // Clear the selected element property so that the Edit panel for the element will disappear
      if ( this.selectedCircuitElementProperty.get() === circuitElement ) {
        this.selectedCircuitElementProperty.set( null );
      }

      // Update the physics
      this.solve();
    },

    /**
     * @param {Vertex} vertex
     * @returns {Array}
     */
    getNeighborCircuitElements: function( vertex ) {
      var neighbors = [];
      var circuitElements = this.getCircuitElements();
      for ( var i = 0; i < circuitElements.length; i++ ) {
        if ( circuitElements[ i ].containsVertex( vertex ) ) {
          neighbors.push( circuitElements[ i ] );
        }
      }
      return neighbors;
    },

    // Duplicates work with the above method to avoid allocations.
    countCircuitElements: function( vertex ) {
      var edgeCount = 0;
      var circuitElements = this.getCircuitElements();
      for ( var i = 0; i < circuitElements.length; i++ ) {
        if ( circuitElements[ i ].containsVertex( vertex ) ) {
          edgeCount++;
        }
      }
      return edgeCount;
    },

    areVerticesConnected: function( vertex1, vertex2 ) {
      var vertexGroup = this.findAllConnectedVertices( vertex1 );
      return vertexGroup.indexOf( vertex2 ) >= 0;
    },

    // @public
    solve: function() {

      var self = this;

      var toStateObject = function( circuitElement ) {
        return _.extend( {
          node0: self.vertices.indexOf( circuitElement.startVertexProperty.get() ),
          node1: self.vertices.indexOf( circuitElement.endVertexProperty.get() ),
          circuitElement: circuitElement
        }, circuitElement.attributesToStateObject() );
      };

      // the index of vertex corresponds to position in list.
      var batteries = this.circuitElements.filter( function( b ) {return b instanceof Battery;} );
      var resistors = this.circuitElements.filter( function( b ) {return !(b instanceof Battery);} );

      var batteryAdapters = batteries.map( toStateObject ).getArray();
      var resistorAdapters = resistors.map( toStateObject ).getArray();

      var solution = new ModifiedNodalAnalysisCircuit( batteryAdapters, resistorAdapters, [] ).solve();

      // Apply the node voltages to the vertices
      for ( var i = 0; i < this.vertices.length; i++ ) {

        // For unconnected vertices, such as for the black box, they may not have an entry in the matrix, so just mark them
        // as zero.
        var v = typeof solution.nodeVoltages[ i ] === 'number' ? solution.nodeVoltages[ i ] : 0;
        this.vertices.get( i ).voltageProperty.set( v );
      }

      // Apply the branch currents
      for ( i = 0; i < solution.elements.length; i++ ) {
        solution.elements[ i ].circuitElement.currentProperty.set( solution.elements[ i ].currentSolution );
      }

      // For resistors with r!==0, we must use Ohm's Law to compute the current
      for ( i = 0; i < resistorAdapters.length; i++ ) {
        var resistorAdapter = resistorAdapters[ i ];
        if ( resistorAdapter.resistance !== 0 ) {
          var voltage = solution.nodeVoltages[ resistorAdapter.node1 ] - solution.nodeVoltages[ resistorAdapter.node0 ];
          var current = -voltage / resistorAdapter.resistance;
          resistorAdapter.circuitElement.currentProperty.set( current );
        }
      }

      this.circuitChangedEmitter.emit();
    },

    /**
     * Connect the vertices, merging oldVertex into vertex1 and deleting oldVertex
     * @param {Vertex} targetVertex
     * @param {Vertex} oldVertex
     * @public
     */
    connect: function( targetVertex, oldVertex ) {
      assert && assert( targetVertex.attachableProperty.get() && oldVertex.attachableProperty.get(), 'both vertices should be attachable' );

      // Keep the black box vertices
      if ( oldVertex.blackBoxInterfaceProperty.get() ) {
        assert && assert( !targetVertex.blackBoxInterfaceProperty.get(), 'cannot attach black box interface vertex to black box interface vertex' );
        this.connect( oldVertex, targetVertex );
      }
      else {
        var circuitElements = this.getCircuitElements();
        for ( var i = 0; i < circuitElements.length; i++ ) {
          if ( circuitElements[ i ].containsVertex( oldVertex ) ) {
            circuitElements[ i ].replaceVertex( oldVertex, targetVertex );
            circuitElements[ i ].connectedEmitter.emit();
          }
        }
        this.vertices.remove( oldVertex );
        assert && assert( !oldVertex.positionProperty.hasListeners(), 'Removed vertex should not have any listeners' );

        // Update the physics
        this.solve();
      }
    },

    step: function( dt ) {
      this.constantDensityPropagator.step( dt );
    },

    /**
     * Happens every frame, even if paused.
     */
    updateElectronsInDirtyCircuitElements: function() {
      var circuitElements = this.circuitElementArray; // TODO: Heavy on GC
      for ( var i = 0; i < circuitElements.length; i++ ) {
        if ( circuitElements[ i ].electronLayoutDirty ) {
          this.constantDensityLayout.layoutElectrons( circuitElements[ i ] );
        }
      }
    },

    // The only way for two vertices to be adjacent is for them to be the start/end of a single CircuitElement
    isVertexAdjacent: function( a, b ) {

      // A vertex cannot be adjacent to itself.  TODO: should this be checked in the call sites?
      if ( a === b ) {
        return false;
      }
      var circuitElements = this.getCircuitElements();
      for ( var i = 0; i < circuitElements.length; i++ ) {
        if ( circuitElements[ i ].containsBothVertices( a, b ) ) {
          return true;
        }
      }
      return false;
    },

    getCircuitElements: function() {
      return this.circuitElements.getArray();
    },

    getFixedLengthCircuitElements: function() {
      return this.circuitElements.filter( function( circuitElement ) {
        return circuitElement instanceof FixedLengthCircuitElement;
      } ).getArray();
    },

    /**
     * Find the neighbor vertices when looking at the given group of circuit elements
     * @param {Vertex} vertex
     * @param {CircuitElement[]} circuitElements
     * @returns {Vertex[]}
     * @private
     */
    getNeighbors: function( vertex, circuitElements ) {
      var neighbors = [];
      for ( var i = 0; i < circuitElements.length; i++ ) {
        var circuitElement = circuitElements[ i ];
        if ( circuitElement.containsVertex( vertex ) ) {
          neighbors.push( circuitElement.getOppositeVertex( vertex ) );
        }
      }
      return neighbors;
    },

    getNeighborVertices: function( vertex ) {
      var neighborCircuitElements = this.getNeighborCircuitElements( vertex );
      return this.getNeighbors( vertex, neighborCircuitElements );
    },

    /**
     * Get a list of all circuit elements that can reach the specified vertex.
     * @param {Vertex} vertex
     * @returns {CircuitElement[]}
     */
    findAllConnectedCircuitElements: function( vertex ) {
      var allConnectedVertices = this.findAllConnectedVertices( vertex );
      var circuitElements = [];
      for ( var i = 0; i < allConnectedVertices.length; i++ ) {
        var neighborCircuitElements = this.getNeighborCircuitElements( allConnectedVertices[ i ] );
        for ( var k = 0; k < neighborCircuitElements.length; k++ ) {
          var neighborCircuitElement = neighborCircuitElements[ k ];
          if ( circuitElements.indexOf( neighborCircuitElement ) === -1 ) {
            circuitElements.push( neighborCircuitElement );
          }
        }
      }
      return circuitElements;
    },

    /**
     * Find the subgraph where all vertices are connected by any kind of (non-infinite resistance) connections
     * @param {Vertex} vertex
     */
    findAllConnectedVertices: function( vertex ) {
      return this.searchVertices( vertex, this.circuitElementArray, function() {return true;} );
    },

    /**
     * Find the subgraph where all vertices are connected, given the list of traversible circuit elements
     * @param {Vertex} vertex
     * @param {CircuitElement[]} circuitElements
     * @param {Function} okToVisit - rule that determines which vertices are OK to visit
     * @returns {Vertex[]}
     */
    searchVertices: function( vertex, circuitElements, okToVisit ) {
      assert && assert( this.vertices.indexOf( vertex ) >= 0, 'Vertex wasn\'t in the model' );
      var fixedVertices = [];
      var toVisit = [ vertex ];
      var visited = [];
      while ( toVisit.length > 0 ) {

        // Find the neighbors joined by a FixedLengthCircuitElement, not a stretchy Wire
        var currentVertex = toVisit.pop();

        // If we haven't visited it before, then explore it
        if ( visited.indexOf( currentVertex ) < 0 ) {
          var neighbors = this.getNeighbors( currentVertex, circuitElements );

          for ( var i = 0; i < neighbors.length; i++ ) {
            var neighbor = neighbors[ i ];

            // If the node was already visited, don't visit again
            if ( visited.indexOf( neighbor ) < 0 && toVisit.indexOf( neighbor ) < 0 && okToVisit( currentVertex, neighbor ) ) {
              toVisit.push( neighbor );
            }
          }
        }
        if ( fixedVertices.indexOf( currentVertex ) < 0 ) {
          fixedVertices.push( currentVertex );
        }
        if ( visited.indexOf( currentVertex ) < 0 ) {
          visited.push( currentVertex );
        }
      }
      return fixedVertices;

    },

    /**
     * Get the electrons that are in the specified circuit element.
     * @param {CircuitElement} circuitElement
     * @returns {Electron[]}
     */
    getElectronsInCircuitElement: function( circuitElement ) {
      return this.electrons.getArray().filter( function( electron ) { return electron.circuitElement === circuitElement; } );
    },

    /**
     * Find the subgraph where all vertices are connected by FixedLengthCircuitElements, not stretchy wires.
     * @param {Vertex} vertex
     * @param {Function} [okToVisit] - rule that determines which vertices are OK to visit
     * @return {Vertex[]}
     */
    findAllFixedVertices: function( vertex, okToVisit ) {
      return this.searchVertices( vertex, this.getFixedLengthCircuitElements(), okToVisit || function() {return true;} );
    },

    /**
     * A vertex has been dragged, is it a candidate for joining with other vertices?  If so, return the candidate
     * vertex.  Otherwise, return null.
     * @param {Vertex} vertex - the dragged vertex
     * @param {string} mode - the application mode 'build' | 'investigate' | undefined
     * @param {Bounds2} blackBoxBounds - the bounds of the black box, if there is one
     * @returns {Vertex} - the vertex it will be able to connect to, if dropped
     * @public
     */
    getDropTarget: function( vertex, mode, blackBoxBounds ) {
      var self = this;

      if ( mode === 'build' ) {
        assert && assert( blackBoxBounds, 'bounds should be provided for build mode' );
      }

      // Rules for a vertex connecting to another vertex.
      // (1) A vertex may not connect to an adjacent vertex.
      var candidateVertices = this.vertices.filter( function( candidateVertex ) {
        return !self.isVertexAdjacent( vertex, candidateVertex );
      } );

      // (2) A vertex cannot connect to itself
      candidateVertices = candidateVertices.filter( function( candidateVertex ) {
        return candidateVertex !== vertex;
      } );

      // (3) a vertex must be within SNAP_RADIUS (screen coordinates) of the other vertex
      candidateVertices = candidateVertices.filter( function( candidateVertex ) {
        return vertex.unsnappedPositionProperty.get().distance( candidateVertex.positionProperty.get() ) < SNAP_RADIUS;
      } );

      // (4) a vertex must be attachable. Some black box vertices are not attachable, such as vertices hidden in the box
      candidateVertices = candidateVertices.filter( function( candidateVertex ) {
        return candidateVertex.attachableProperty.get();
      } );

      // (5) Reject any matches that result in circuit elements sharing a pair of vertices, which would cause
      // the wires to lay across one another (one vertex was already shared)
      candidateVertices = candidateVertices.filter( function( candidateVertex ) {

        // if something else is already snapping to candidateVertex, then we cannot snap to it as well.
        // check the neighbor vertices
        for ( var i = 0; i < self.vertices.length; i++ ) {
          var circuitVertex = self.vertices.get( i );
          var adjacent = self.isVertexAdjacent( circuitVertex, vertex );

          // If the adjacent vertex has the same position as the candidate vertex, that means it is already "snapped"
          // there and hence another vertex should not snap there at the same time.
          if ( adjacent && circuitVertex.positionProperty.get().equals( candidateVertex.positionProperty.get() ) ) {
            return false;
          }
        }
        return true;
      } );

      // (6) a vertex cannot be connected to its own fixed subgraph (no wire)
      var fixedVertices = this.findAllFixedVertices( vertex );
      candidateVertices = candidateVertices.filter( function( candidateVertex ) {
        for ( var i = 0; i < fixedVertices.length; i++ ) {
          if ( fixedVertices[ i ] === candidateVertex ) {
            return false;
          }
        }
        return true;
      } );

      // (7) a wire vertex cannot connect if its neighbor is already proposing a connection
      candidateVertices = candidateVertices.filter( function( candidateVertex ) {

        // You can always attach to a black box interface
        if ( candidateVertex.blackBoxInterfaceProperty.get() ) {
          return true;
        }
        var neighbors = self.getNeighborCircuitElements( candidateVertex );
        for ( var i = 0; i < neighbors.length; i++ ) {
          var neighbor = neighbors[ i ];
          var oppositeVertex = neighbor.getOppositeVertex( candidateVertex );

          // is another node proposing a match to that node?
          for ( var k = 0; k < self.vertices.length; k++ ) {
            var v = self.vertices.get( k );
            if ( neighbor instanceof Wire && v !== vertex && v !== oppositeVertex && v.positionProperty.get().equals( oppositeVertex.positionProperty.get() ) ) {
              return false;
            }
          }
        }
        return true;
      } );

      // (8) a wire vertex cannot double connect to an object, creating a tiny short circuit
      candidateVertices = candidateVertices.filter( function( candidateVertex ) {
        var candidateNeighbors = self.getNeighborVertices( candidateVertex );
        var myNeighbors = self.getNeighborVertices( vertex );
        var intersection = _.intersection( candidateNeighbors, myNeighbors );
        return intersection.length === 0;
      } );

      // (9) When in Black Box "build" mode (i.e. building inside the black box), a vertex user cannot connect to
      // a black box interface vertex if its other vertices would be outside of the black box.  See #136
      if ( mode === 'build' ) {
        var fixedVertices2 = this.findAllFixedVertices( vertex );
        candidateVertices = candidateVertices.filter( function( candidateVertex ) {

          // Don't connect to vertices that might have sneaked outside of the black box, say by a rotation.
          if ( !candidateVertex.blackBoxInterfaceProperty.get() && !blackBoxBounds.containsPoint( candidateVertex.positionProperty.get() ) ) {
            return false;
          }

          // How far the vertex would be moved if it joined to the candidate
          var delta = candidateVertex.positionProperty.get().minus( vertex.positionProperty.get() );

          if ( candidateVertex.blackBoxInterfaceProperty.get() || blackBoxBounds.containsPoint( candidateVertex.positionProperty.get() ) ) {
            for ( var i = 0; i < fixedVertices2.length; i++ ) {
              var connectedVertex = fixedVertices2[ i ];
              if ( connectedVertex.blackBoxInterfaceProperty.get() ) {

                // OK for black box interface vertex to be slightly outside the box
              }
              else if ( connectedVertex !== vertex && !blackBoxBounds.containsPoint( connectedVertex.positionProperty.get().plus( delta ) ) &&

                        // exempt wires connected outside of the black box, which are flagged as un-attachable in
                        // build mode, see #141
                        connectedVertex.attachableProperty.get() ) {
                return false;
              }
            }
          }
          else {
            return true;
          }
          return true;
        } );
      }

      if ( candidateVertices.length === 0 ) {
        return null;
      }
      else {

        // Find the closest match
        var sorted = _.sortBy( candidateVertices.getArray(), function( candidateVertex ) {
          return vertex.unsnappedPositionProperty.get().distance( candidateVertex.positionProperty.get() );
        } );
        return sorted[ 0 ];
      }
    },

    reset: function() {
      this.clear();
      this.showElectronsProperty.reset();
    },

    toStateObject: function() {
      var self = this;
      var getVertexIndex = function( vertex ) {
        var vertexIndex = self.vertices.indexOf( vertex );
        assert && assert( vertexIndex >= 0, 'vertex should have an index' );
        return vertexIndex;
      };

      /**
       * @param {ObservableArray.<CircuitElement>} circuitElements
       * @returns {Array}
       */
      var getArray = function( circuitElements ) {
        return circuitElements.map( function( element ) {
          return _.extend( {
            startVertex: getVertexIndex( element.startVertexProperty.get() ),
            endVertex: getVertexIndex( element.endVertexProperty.get() ),
          }, element.attributesToStateObject() );
        } ).getArray();
      };
      return {

        // TODO: better save state that matches circuit structure
        wires: getArray( this.circuitElements.filter( function( c ) {return c instanceof Wire;} ) ),
        batteries: getArray( this.circuitElements.filter( function( c ) {return c instanceof Battery;} ) ),
        lightBulbs: getArray( this.circuitElements.filter( function( c ) {return c instanceof LightBulb;} ) ),
        resistors: getArray( this.circuitElements.filter( function( c ) {return c instanceof Resistor;} ) ),
        switches: getArray( this.circuitElements.filter( function( c ) {return c instanceof Switch;} ) ),
        vertices: this.vertices.map( function( vertex ) {

          var v = {
            x: vertex.positionProperty.get().x,
            y: vertex.positionProperty.get().y
          };

          // Include any non-default options
          var defaults = Vertex.DEFAULTS;

          // Capture all non-default values for vertex options, if any
          var options = {};
          if ( vertex.attachableProperty.get() !== defaults.attachable ) {
            options.attachable = vertex.attachableProperty.get();
          }
          if ( vertex.draggableProperty.get() !== defaults.draggable ) {
            options.draggable = vertex.draggableProperty.get();
          }
          if ( _.keys( options ).length > 0 ) {
            v.options = options;
          }

          return v;
        } ).getArray()
      };
    },
    loadFromCircuitStruct: function( circuitStruct ) {
      var self = this;
      this.clear();
      circuitStruct.vertices.forEach( this.vertices.add.bind( this.vertices ) );
      var addCircuitElement = function( circuitElement ) {
        self.circuitElements.add( circuitElement );
      };
      circuitStruct.wires.forEach( addCircuitElement );
      circuitStruct.switches.forEach( addCircuitElement );
      circuitStruct.batteries.forEach( addCircuitElement );
      circuitStruct.resistors.forEach( addCircuitElement );
      circuitStruct.lightBulbs.forEach( addCircuitElement );
    }
  } );
} );