// Copyright 2015-2016, University of Colorado Boulder
// TODO: Review, document, annotate, i18n, bring up to standards

/**
 * A wire whose length can change.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var circuitConstructionKitCommon = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/circuitConstructionKitCommon' );
  var inherit = require( 'PHET_CORE/inherit' );
  var CircuitElement = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/common/model/CircuitElement' );
  var CircuitConstructionKitConstants = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/CircuitConstructionKitConstants' );
  var NumberProperty = require( 'AXON/NumberProperty' );

  // constants
  var METERS_PER_VIEW_COORDINATE = 0.015273409966500692; // Conversion factor

  /**
   * Wire main constructor
   * @param {Vertex} startVertex
   * @param {Vertex} endVertex
   * @param {Property.<number>} resistivityProperty
   * @param {Object} [options]
   * @constructor
   */
  function Wire( startVertex, endVertex, resistivityProperty, options ) {
    assert && assert( typeof resistivityProperty !== 'number', 'property should not be a number' );
    options = _.extend( { wireStub: false }, options );
    var self = this;
    var chargePathLength = startVertex.positionProperty.get().distance( endVertex.positionProperty.get() );
    CircuitElement.call( this, startVertex, endVertex, chargePathLength, options );

    // @public (read-only)
    this.wireStub = options.wireStub;

    // @public (read-only) - the resistance of the Wire in ohms
    this.resistanceProperty = new NumberProperty( CircuitConstructionKitConstants.MINIMUM_RESISTANCE );

    // @public (read-only) - the resistivity of the Wire in ohm-meters
    this.resistivityProperty = resistivityProperty;

    /**
     * When the vertex moves, updates the resistance and charge path length.
     */
    var vertexMovedListener = function() {
      var startPosition = self.startVertexProperty.get().positionProperty.get();
      var endPosition = self.endVertexProperty.get().positionProperty.get();
      var viewLength = startPosition.distance( endPosition );
      var modelLength = viewLength * METERS_PER_VIEW_COORDINATE;
      var resistance = modelLength * self.resistivityProperty.get();
      var clampedResistance = Math.max( CircuitConstructionKitConstants.MINIMUM_RESISTANCE, resistance );
      assert && assert( !isNaN( clampedResistance ), 'wire resistance should not be NaN' );
      self.resistanceProperty.set( clampedResistance );
      self.chargePathLength = viewLength;
    };

    // Use `self` here instead of `this` so IDEA doesn't mark the property as missing.
    self.vertexMovedEmitter.addListener( vertexMovedListener );

    // Update the resistance and charge path length on startup
    vertexMovedListener();

    this.resistivityProperty.link( function() {
      vertexMovedListener();
    } );

    this.disposeWire = function() {
      assert && assert( !self.disposed, 'Was already disposed' );
      self.disposed = true;
      self.vertexMovedEmitter.removeListener( vertexMovedListener );
    };
    this.disposed = false;
  }

  circuitConstructionKitCommon.register( 'Wire', Wire );

  return inherit( CircuitElement, Wire, {

    /**
     * @override
     * @returns {Property[]}
     * @public
     */
    getCircuitProperties: function() {
      return [ this.resistanceProperty ];
    },

    /**
     * Releases all resources related to the Wire, called when it will no longer be used.
     * @public
     */
    dispose: function() {
      CircuitElement.prototype.dispose.call( this );
      this.disposeWire();
    },

    /**
     * Returns an object with the state of the Wire, so that it can be saved/loaded.
     * @returns {Object}
     * @public
     */
    attributesToStateObject: function() {
      return {
        resistance: this.resistanceProperty.get(),
        resistivity: this.resistivityProperty.get()
      };
    }
  } );
} );