// Copyright 2015, University of Colorado Boulder

/**
 * A collection of circuit components in the play area, not necessarily connected.  (For instance it could be 2 logical
 * circuits).
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var ObservableArray = require( 'AXON/ObservableArray' );
  var Vertex = require( 'CIRCUIT_CONSTRUCTION_KIT_BASICS/common/model/Vertex' );
  var OOCircuit = require( 'CIRCUIT_CONSTRUCTION_KIT_BASICS/common/model/modified-nodal-analysis/OOCircuit' );

  /**
   *
   * @constructor
   */
  function Circuit() {
    var circuit = this;
    this.wires = new ObservableArray();
    this.batteries = new ObservableArray();
    this.lightBulbs = new ObservableArray();
    this.resistors = new ObservableArray();

    // Keep track of which terminals are connected to other terminals
    // This is redundant (connections tracked in the elements above), but a central point for
    // observing creation/deletion of vertices for showing VertexNodes
    this.vertices = new ObservableArray();

    // When a new component is added to a circuit, it has two unconnected vertices
    var addVertices = function( circuitElement ) {
      circuit.vertices.add( circuitElement.startVertex );
      circuit.vertices.add( circuitElement.endVertex );
    };
    this.wires.addItemAddedListener( addVertices );
    this.batteries.addItemAddedListener( addVertices );
    this.lightBulbs.addItemAddedListener( addVertices );
    this.resistors.addItemAddedListener( addVertices );
  }

  return inherit( Object, Circuit, {

    // @public
    solve: function() {

      // These are just to keep lint from complaining, so that we can load these dependencies into the module system
      // for qunit tests
      new OOCircuit().solve();
    },

    // @public
    wireTerminalDragged: function( wire, terminalPositionProperty ) {
      for ( var i = 0; i < this.vertices.getArray().length; i++ ) {
        var vertex = this.vertices.getArray()[ i ];
        if ( vertex.isConnectedTo( wire, terminalPositionProperty ) ) {
          vertex.setPosition( terminalPositionProperty.get() );
        }
      }
    },

    // If the proposed vertex was made, would the wires overlap?  If so, do not allow them to connect.
    wouldOverlap: function( wire1, terminalPositionProperty1, wire2, terminalPositionProperty2 ) {
      return this.isConnected(
        wire1, wire1.getOppositeTerminalPositionProperty( terminalPositionProperty1 ),
        wire2, wire2.getOppositeTerminalPositionProperty( terminalPositionProperty2 )
      );
    },

    isConnected: function( wire1, terminalPositionProperty1, wire2, terminalPositionProperty2 ) {

      // see if any pre-existing vertices will work
      for ( var i = 0; i < this.vertices.getArray().length; i++ ) {
        var vertex = this.vertices.getArray()[ i ];
        if ( vertex.isConnectedTo( wire1, terminalPositionProperty1 ) && vertex.isConnectedTo( wire2, terminalPositionProperty2 ) ) {
          return true;
        }
      }
    },

    // @public
    connect: function( vertex1, vertex2 ) {

      // TODO: delete one of the vertices, and replace all usages with the other
    },

    // The only way for two vertices to be adjacent is for them to be the start/end of a single CircuitElement
    isVertexAdjacent: function( a, b ) {
      var circuitElements = this.getCircuitElements();
      for ( var i = 0; i < circuitElements.length; i++ ) {
        if ( circuitElements[ i ].hasBothVertices( a, b ) ) {
          return true;
        }
      }
      return false;
    },

    getCircuitElements: function() {
      return this.wires.getArray().concat( this.batteries.getArray() ).concat( this.lightBulbs.getArray() );
    },

    /**
     * A vertex has been dragged, is it a candidate for joining with other vertices?  If so, return the candidate
     * vertex.  Otherwise, return null.
     * @param {Vertex} vertex
     * @returns {Vertex}
     * @public
     */
    getDropTarget: function( vertex ) {
      var circuit = this;

      // Rules for a vertex connecting to another vertex.
      // (1) A vertex may not connect to an adjacent vertex.
      var candidateVertices = this.vertices.filter( function( candidateVertex ) {
        return !circuit.isVertexAdjacent( vertex, candidateVertex );
      } );

      // (2) A vertex cannot connect to itself
      candidateVertices = candidateVertices.filter( function( candidateVertex ) {
        return candidateVertex !== vertex;
      } );

      // (3) a vertex must be within 100px (screen coordinates) of the other vertex
      candidateVertices = candidateVertices.filter( function( candidateVertex ) {
        return vertex.position.distance( candidateVertex.position ) < 100;
      } );
      if ( candidateVertices.length === 0 ) {
        return null;
      }
      else {

        // Find the closest match
        var sorted = _.sortBy( candidateVertices.getArray(), function( candidateVertex ) {
          return vertex.position.distance( candidateVertex.position );
        } );
        return sorted[ 0 ];
      }
    }
  } );
} );