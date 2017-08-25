// Copyright 2016-2017, University of Colorado Boulder

/**
 * Renders a single charge. Electrons are shown as a sphere with a minus sign and conventional current is shown as an
 * arrow.  Electrons are shown when current is zero, but conventional current is not shown for zero current.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var BooleanProperty = require( 'AXON/BooleanProperty' );
  var circuitConstructionKitCommon = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/circuitConstructionKitCommon' );
  var ConventionalCurrentArrowNode = require( 'CIRCUIT_CONSTRUCTION_KIT_COMMON/view/ConventionalCurrentArrowNode' );
  var Matrix3 = require( 'DOT/Matrix3' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Image = require( 'SCENERY/nodes/Image' );
  var ElectronChargeNode = require( 'SCENERY_PHET/ElectronChargeNode' );
  var Tandem = require( 'TANDEM/Tandem' );

  // constants
  var ELECTRON_CHARGE_NODE = new ElectronChargeNode( {

    // electrons are transparent to signify they are just a representation, not physical electrons
    opacity: 0.75,

    // selected so an electron will exactly fit the width of a wire
    scale: 0.78
  } ).toDataURLImageSynchronous();
  var ARROW_NODE = new ConventionalCurrentArrowNode( Tandem.createStaticTandem( 'arrowNode' ) )
    .toDataURLImageSynchronous();

  /**
   * @param {Charge} charge - the model element
   * @param {Property.<boolean>} revealingProperty - true if circuit details are being shown
   * @constructor
   */
  function ChargeNode( charge, revealingProperty ) {
    var self = this;

    // @public (read-only) {Charge} - the model depicted by this node
    this.charge = charge;

    // @private {Property.<boolean>} - true if circuit details are being shown
    this.revealingProperty = revealingProperty;

    var child = charge.charge > 0 ? ARROW_NODE : ELECTRON_CHARGE_NODE;

    Image.call( this, child.image, {
      pickable: false
    } );

    // Negative charges should be transparent
    this.setImageOpacity( charge.charge < 0 ? 0.75 : 1 );

    this.outsideOfBlackBoxProperty = new BooleanProperty( false );

    // Update the visibility accordingly.  A multilink will not work because the charge circuitElement changes.
    var updateVisible = this.updateVisible.bind( this );

    // When the model position changes, update the node position
    var updateTransform = this.updateTransform.bind( this );

    //REVIEW*: Maybe lazyLink these and call it directly afterwards? That's 5 calls to something that may be in a "hot"
    //REVIEW: codepath (as noted by charge updates when dragging the lightbulb).
    charge.changedEmitter.addListener( updateTransform );
    revealingProperty.link( updateVisible );
    charge.visibleProperty.link( updateVisible );
    this.outsideOfBlackBoxProperty.link( updateVisible );

    //REVIEW*: Same notes about potential memory/performance loss by creating the function for every ChargeNode.
    var disposeChargeNode = function() {
      self.detach();
      charge.changedEmitter.removeListener( updateTransform );
      revealingProperty.unlink( updateVisible );
      charge.visibleProperty.unlink( updateVisible );
      self.outsideOfBlackBoxProperty.unlink( updateVisible );

      // We must remove the image child node, or it will continue to track its parents and lead to a memory leak
      self.removeAllChildren();
    };
    charge.disposeEmitter.addListener( disposeChargeNode );

    updateTransform();
  }

  circuitConstructionKitCommon.register( 'ChargeNode', ChargeNode );

  return inherit( Image, ChargeNode, {

    /**
     * @private - update the transform of the charge node
     */
    updateTransform: function() {
      var charge = this.charge;
      var current = charge.circuitElement.currentProperty.get();
      var position = charge.position;

      if ( charge.charge > 0 ) {
        var angle = charge.charge < 0 ? 0 : charge.angle + ( current < 0 ? Math.PI : 0 );

        // Rotate then center the rotated node
        //REVIEW*: Could reuse a Matrix3 object for this purpose if desired.
        //REVIEW*: Also, why not just set this.rotation = angle? The translation is getting overwritten below anyways.
        //REVIEW*: Is there a concern about a scale being set, that we're zeroing a scale?
        this.setMatrix( Matrix3.rotation2( angle ) );

        //REVIEW*: Is it safe to assume the center could be 0,0, and the center computation could be avoided?
        this.center = position;
      }
      else {

        // position the electron--note the offsets that were used to make it look exactly centered, see
        // https://github.com/phetsims/circuit-construction-kit-dc/issues/104
        this.setTranslation(
          position.x - ELECTRON_CHARGE_NODE.width / 2 - 0.5,
          position.y - ELECTRON_CHARGE_NODE.height / 2 - 0.5
        );
      }
      this.updateVisible();
      this.outsideOfBlackBoxProperty.set( !charge.circuitElement.insideTrueBlackBoxProperty.get() );
    },

    /**
     * @private - update the visibility
     */
    updateVisible: function() {
      this.visible = this.charge.visibleProperty.get() &&
                     ( this.outsideOfBlackBoxProperty.get() || this.revealingProperty.get() ) &&
                     ( Math.abs( this.charge.circuitElement.currentProperty.get() ) > 1E-6 || this.charge.charge < 0 );
    }
  }, {

    /**
     * Identifies the images used to render this node so they can be prepopulated in the WebGL sprite sheet.
     * @public {Array.<Image>}
     */
    webglSpriteNodes: [
      ELECTRON_CHARGE_NODE, ARROW_NODE
    ]
  } );
} );