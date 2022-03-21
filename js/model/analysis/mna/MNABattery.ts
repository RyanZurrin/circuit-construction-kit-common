// Copyright 2021, University of Colorado Boulder

import MNACircuitElement from './MNACircuitElement.js';
import circuitConstructionKitCommon from '../../../circuitConstructionKitCommon.js';

export default class MNABattery extends MNACircuitElement {
  readonly voltage: number;

  constructor( nodeId0: string, nodeId1: string, voltage: number ) {
    super( nodeId0, nodeId1 );
    this.voltage = voltage;
  }
}

circuitConstructionKitCommon.register( 'MNABattery', MNABattery );