// Copyright 2019-2021, University of Colorado Boulder

/**
 * TimestepSubdivisions updates a state over an interval dt by (potentially) subdividing it into smaller regions,
 * potentially with different lengths. To select the (sub) time step for each iteration, the difference between an
 * update of h and two updates of h/2 are performed. If the error between the h vs. 2x(h/2) states is within the
 * tolerated threshold, the time step is accepted. See Unfuddle#2241. Ported from Java on Feb 11, 2019
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import CCKCQueryParameters from '../CCKCQueryParameters.js';
import circuitConstructionKitCommon from '../circuitConstructionKitCommon.js';
import ResultSet from './ResultSet.js';

// smallest possible time
const MIN_DT = CCKCQueryParameters.minDT;

//threshold for determining whether 2 states are similar enough; any error less than errorThreshold will be tolerated.
const ERROR_THRESHOLD = 1E-5;

type Steppable<T> = {
  update: ( state: T, dt: number ) => T,
  distance: ( a: T, b: T ) => number
};

/**
 * @typedef Steppable
 * @property update<T>(state:T,dt:number):T - immutable time integration from one state to the next by a time of dt
 * @property distance<T>(state1:T,state2:T):number - determine how much two states differ
 */

class TimestepSubdivisions<T> {

  /**
   * @param {Object} originalState
   * @param {Steppable} steppable with update function
   * @param {number} totalTime
   * @returns {ResultSet}
   * @public
   */
  stepInTimeWithHistory( originalState: T, steppable: Steppable<T>, totalTime: number ) {
    let state = originalState;
    let elapsedTime = 0.0;
    const states: { dt: number, state: T }[] = [];
    let attemptedDT = totalTime;
    while ( elapsedTime < totalTime ) {

      const result = this.search( state, steppable, attemptedDT, null );
      state = result.state;
      states.push( result );
      elapsedTime = elapsedTime + result.dt;

      // If the system was highly nonlinear in one region, we may have had very small dt.  If the system is linear
      // afterwards, allow the opportunity to increase dt accordingly.
      attemptedDT = result.dt * 2;
      if ( attemptedDT > totalTime - elapsedTime ) {
        attemptedDT = totalTime - elapsedTime;
      }
    }
    if ( phet.log ) {
      console.log( 'states per frame: ' + states.length );
    }
    return new ResultSet<T>( states );
  }

  /**
   * Recursively searches for a value of dt that has acceptable error, starting with the value dt
   *
   * @param {Object} state     the initial state
   * @param {Steppable} steppable the update algorithm and distance metric
   * @param {number} dt        the initial value to use for dt
   * @param {Object} halfStepState - efficiently reuse value from parent call, instead of recomputing it.
   * @returns {number} the selected timestep that has acceptable error or meets the minimum allowed
   * @private
   */
  search( state: T, steppable: Steppable<T>, dt: number, halfStepState: T | null ): { dt: number, state: T } {

    // if dt is already too low, no need to do error checking
    if ( dt <= MIN_DT ) {
      return { dt: MIN_DT, state: steppable.update( state, MIN_DT ) };
    }
    else {
      const a = steppable.update( state, dt );
      const b1 = halfStepState || steppable.update( state, dt / 2 );
      const b2 = steppable.update( b1, dt / 2 );
      const distance = steppable.distance( a, b2 );
      assert && assert( !isNaN( distance ), 'distance should be numeric' );
      const errorAcceptable = distance < ERROR_THRESHOLD;
      if ( errorAcceptable ) {
        return { dt: dt, state: b2 }; // Use the more precise estimate
      }
      else {
        return this.search( state, steppable, dt / 2, b1 );
      }
    }
  }
}

circuitConstructionKitCommon.register( 'TimestepSubdivisions', TimestepSubdivisions );
export default TimestepSubdivisions;