// Copyright 2015-2017, University of Colorado Boulder

/**
 * Model for an ammeter than can be connected in series with a circuit.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var Property = require( 'AXON/Property' );
  var circuitConstructionKitCommon = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/circuitConstructionKitCommon' );
  var CircuitConstructionKitCommonConstants = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/CircuitConstructionKitCommonConstants' );
  var FixedLengthCircuitElement = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/model/FixedLengthCircuitElement' );
  var inherit = require( 'PHET_CORE/inherit' );

  /**
   * @param {Vertex} startVertex
   * @param {Vertex} endVertex
   * @param {Tandem} tandem
   * @param {Object} [options]
   * @constructor
   */
  function SeriesAmmeter( startVertex, endVertex, tandem, options ) {
    FixedLengthCircuitElement.call( this, startVertex, endVertex, CircuitConstructionKitCommonConstants.SERIES_AMMETER_LENGTH,
      CircuitConstructionKitCommonConstants.SERIES_AMMETER_LENGTH, tandem, options );

    // @public (read-only) {Property.<number>} the resistance in ohms.  A constant, but modeled as a property for
    // uniformity with other resistive elements.
    this.resistanceProperty = new Property( 0 );
  }

  circuitConstructionKitCommon.register( 'SeriesAmmeter', SeriesAmmeter );

  return inherit( FixedLengthCircuitElement, SeriesAmmeter, {

      /**
       * Get the properties so that the circuit can be solved when changed.
       * @override
       * @returns {Property.<*>[]}
       * @public
       */
      getCircuitProperties: function() {

        // No internal parameters that can change the circuit
        return [];
      }
    }
  );
} );