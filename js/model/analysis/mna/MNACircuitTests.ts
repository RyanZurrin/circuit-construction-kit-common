// Copyright 2015-2021, University of Colorado Boulder

/**
 * MNACircuit tests
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import MNACircuit from './MNACircuit.js';
import MNASolution from './MNASolution.js';
import MNAResistor from './MNAResistor.js';
import MNABattery from './MNABattery.js';
import MNACurrent from './MNACurrent.js';
import MNACircuitElement from './MNACircuitElement.js';

QUnit.module( 'MNACircuitTests' );

const approxEquals = ( a: number, b: number ) => Math.abs( a - b ) < 1E-6;

QUnit.test( 'test_battery_resistor_circuit_should_have_correct_voltages_and_currents_for_a_simple_circuit',
  assert => {
    const battery = new MNABattery( '0', '1', 4.0 );
    const resistor = new MNAResistor( '1', '0', 4.0 );
    const circuit = new MNACircuit( [ battery ], [ resistor ], [] );

    const desiredSolution = new MNASolution( new Map( [ [ '0', 0 ], [ '1', 4 ] ] ), new Map( [
      [ battery, 1.0 ]
    ] ) );
    const solution = circuit.solve();
    assert.equal( true, solution.approxEquals( desiredSolution, assert ), 'solutions instances should match' );

    const currentThroughResistor = solution.getCurrentForResistor( resistor );

    // should be flowing forward through resistor
    assert.equal( approxEquals( currentThroughResistor, 1.0 ), true, 'current should be 1 amp through the resistor' );
  } );

QUnit.test( 'test_battery_resistor_circuit_should_have_correct_voltages_and_currents_for_a_simple_circuit_ii',
  assert => {
    const battery = new MNABattery( '0', '1', 4.0 );
    const resistor = new MNAResistor( '1', '0', 2.0 );
    const circuit = new MNACircuit( [ battery ], [ resistor ], [] );
    const desiredSolution = new MNASolution( new Map( [
      [ '0', 0 ],
      [ '1', 4 ]
    ] ), new Map<MNACircuitElement, number>( [
      [ battery, 2.0 ]
    ] ) );
    const solution = circuit.solve();
    assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solution should match' );
  } );


QUnit.test( 'test_should_be_able_to_obtain_current_for_a_resistor', assert => {
  const battery = new MNABattery( '0', '1', 4.0 );
  const resistor = new MNAResistor( '1', '0', 2.0 );
  const solution = new MNACircuit( [ battery ], [ resistor ], [] ).solve();
  const desiredSolution = new MNASolution( new Map( [
    [ '0', 0 ],
    [ '1', 4 ]
  ] ), new Map<MNACircuitElement, number>( [
    [ battery, 2.0 ]
  ] ) );
  assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solution should match' );

  // same magnitude as battery: positive because current flows from node 1 to 0
  assert.equal(
    approxEquals( solution.getCurrentForResistor( resistor ), 2 ), true, 'current through resistor should be 2.0 Amps'
  );
} );

QUnit.test( 'test_an_unconnected_resistor_shouldnt_cause_problems', assert => {
  const battery = new MNABattery( '0', '1', 4.0 );
  const resistor1 = new MNAResistor( '1', '0', 4.0 );
  const resistor2 = new MNAResistor( '2', '3', 100 );
  const circuit = new MNACircuit( [ battery ], [ resistor1, resistor2 ], [] );
  const desiredSolution = new MNASolution( new Map( [
    [ '0', 0 ],
    [ '1', 4 ],
    [ '2', 0 ],
    [ '3', 0 ]
  ] ), new Map<MNACircuitElement, number>( [
    [ battery, 1.0 ]
  ] ) );
  const solution = circuit.solve();
  assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solutions should match' );
} );

QUnit.test( 'test_current_source_should_provide_current', assert => {
  const currentSource = new MNACurrent( '0', '1', 10 );
  const resistor = new MNAResistor( '1', '0', 4 );
  const circuit = new MNACircuit( [], [ resistor ], [ currentSource ] );
  const voltageMap = new Map( [
    [ '0', 0 ],

    // This is negative since traversing across the resistor should yield a negative voltage, see
    // http://en.wikipedia.org/wiki/Current_source
    [ '1', -40.0 ]
  ] );
  const desiredSolution = new MNASolution( voltageMap, new Map<MNACircuitElement, number>() );
  const solution = circuit.solve();
  assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solutions should match' );
} );

QUnit.test( 'test_current_should_be_reversed_when_voltage_is_reversed', assert => {
  const battery = new MNABattery( '0', '1', -4 );
  const resistor = new MNAResistor( '1', '0', 2 );
  const circuit = new MNACircuit( [ battery ], [ resistor ], [] );
  const voltageMap = new Map( [
    [ '0', 0 ],
    [ '1', -4 ]
  ] );

  const desiredSolution = new MNASolution( voltageMap, new Map<MNACircuitElement, number>( [
    [ battery, -2.0 ]
  ] ) );
  const solution = circuit.solve();
  assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solutions should match' );
} );

QUnit.test( 'test_two_batteries_in_series_should_have_voltage_added', assert => {
  const battery1 = new MNABattery( '0', '1', -4 );
  const battery2 = new MNABattery( '1', '2', -4 );
  const resistor1 = new MNAResistor( '2', '0', 2.0 );
  const circuit = new MNACircuit( [ battery1, battery2 ], [ resistor1 ], [] );

  const desiredSolution = new MNASolution( new Map( [
    [ '0', 0 ],
    [ '1', -4 ],
    [ '2', -8 ]
  ] ), new Map<MNACircuitElement, number>( [
    [ battery1, -4.0 ],
    [ battery2, -4.0 ]
  ] ) );
  const solution = circuit.solve();
  assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solutions should match' );
} );

QUnit.test( 'test_two_resistors_in_series_should_have_resistance_added', assert => {
  const battery = new MNABattery( '0', '1', 5.0 );
  const resistor1 = new MNAResistor( '1', '2', 10.0 );
  const resistor2 = new MNAResistor( '2', '0', 10.0 );
  const circuit = new MNACircuit( [ battery ], [
    resistor1,
    resistor2
  ], [] );
  const voltageMap = new Map( [
    [ '0', 0 ],
    [ '1', 5 ],
    [ '2', 2.5 ]
  ] );
  const desiredSolution = new MNASolution( voltageMap, new Map<MNACircuitElement, number>( [
    [ battery, 5 / 20.0 ]
  ] ) );
  const solution = circuit.solve();
  assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solutions should match' );
} );

QUnit.test( 'test_A_resistor_with_one_node_unconnected_shouldnt_cause_problems', assert => {
  const battery = new MNABattery( '0', '1', 4.0 );
  const resistor1 = new MNAResistor( '1', '0', 4.0 );
  const resistor2 = new MNAResistor( '0', '2', 100.0 );
  const circuit = new MNACircuit(
    [ battery ],
    [ resistor1, resistor2 ], []
  );
  const voltageMap = new Map( [
    [ '0', 0 ],
    [ '1', 4 ],
    [ '2', 0 ]
  ] );
  const desiredSolution = new MNASolution( voltageMap, new Map<MNACircuitElement, number>( [
    [ battery, 1.0 ]
  ] ) );
  const solution = circuit.solve();
  assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solutions should match' );
} );

QUnit.test( 'test_an_unconnected_resistor_shouldnt_cause_problems', assert => {
  const battery = new MNABattery( '0', '1', 4.0 );
  const resistor1 = new MNAResistor( '1', '0', 4.0 );
  const resistor2 = new MNAResistor( '2', '3', 100.0 );
  const circuit = new MNACircuit( [ battery ], [
    resistor1,
    resistor2
  ], [] );
  const voltageMap = new Map( [
    [ '0', 0 ],
    [ '1', 4 ],
    [ '2', 0 ],
    [ '3', 0 ]
  ] );

  const desiredSolution = new MNASolution( voltageMap, new Map<MNACircuitElement, number>( [
    [ battery, 1.0 ]
  ] ) );
  const solution = circuit.solve();
  assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solutions should match' );
} );

QUnit.test( 'test_should_handle_resistors_with_no_resistance', assert => {
  const battery = new MNABattery( '0', '1', 5 );
  const resistor = new MNAResistor( '2', '0', 0 );
  const resistor0 = new MNAResistor( '1', '2', 10 );
  const circuit = new MNACircuit( [ battery ], [
    resistor0,
    resistor
  ], [] );
  const voltageMap = new Map( [
    [ '0', 0 ],
    [ '1', 5 ],
    [ '2', 0 ]
  ] );
  const desiredSolution = new MNASolution( voltageMap, new Map<MNACircuitElement, number>( [
    [ battery, 5 / 10 ],
    [ resistor, 5 / 10 ]
  ] ) );
  const solution = circuit.solve();
  assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solutions should match' );
} );

QUnit.test( 'test_resistors_in_parallel_should_have_harmonic_mean_of_resistance', assert => {
  const V = 9.0;
  const R1 = 5.0;
  const R2 = 5.0;
  const Req = 1 / ( 1 / R1 + 1 / R2 );
  const battery = new MNABattery( '0', '1', V );
  const resistor1 = new MNAResistor( '1', '0', R1 );
  const resistor2 = new MNAResistor( '1', '0', R2 );
  const circuit = new MNACircuit( [ battery ], [
    resistor1,
    resistor2
  ], [] );
  const voltageMap = new Map( [
    [ '0', 0 ],
    [ '1', V ]
  ] );

  const desiredSolution = new MNASolution( voltageMap, new Map<MNACircuitElement, number>( [
    [ battery, V / Req ]
  ] ) );
  const solution = circuit.solve();
  assert.equal( solution.approxEquals( desiredSolution, assert ), true, 'solutions should match' );
} );