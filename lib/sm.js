// Author: Felix Hoerandner (2014)

if (typeof setImmediate === 'undefined')
  var setImmediate = function () {
    var args = Array.prototype.slice.call(arguments);
    var fun = args.shift();
    setTimeout(function () {
      fun.apply(null, args);
    }, 1);
  };

var ERROR     = 'error';
var EXIT      = 'exit';
var NOT_FOUND = 'not-found';
var STATE     = 'state';

// creates a state machine with the given state definitions
// closure states: an array of states
// returns function (context, done):
//   upon invocation, this function processes the states of the state machine
//   context: the context object is given to all states
//   done: function (event, context), this callback is called after the state
//     machine exited
var machine = function (states) {
  return function (context, done) {

    var currentIndex = 0;

    // tries to find the next state and, subsequently, to execute it
    var followTransition = function (event) {
      if (findNextState(event))
        setImmediate(executeCurrentState);
    };

    // tries to find a suitable state based on the current state and the given
    // event
    // if such a state is found, it's index is stored in currentIndex
    // returns true if a state is found and false otherwise
    var findNextState = function (event) {
      // find the current state
      if (currentIndex >= states.length) {
        done(EXIT, context);
        return false;
      }
      var state = states[currentIndex];

      var selectedState = null;

      // find match based on transitions
      if (state.hasOwnProperty('transitions')) {
        var transitions = state.transitions;
        for (var i = 0; i < transitions.length; i++) {
          var transition = transitions[i];
          // TODO also match based on function-result
          if (transition[0] == event) {
            selectedState = transition[1];
            break;
          }
        }
      }

      // if no match found, check for special behavior
      if (selectedState === null) {
        if (event && event.indexOf(STATE) === 0) {
          selectedState = event.substr(STATE.length + 1);
        } else if (event === ERROR) {
          done(ERROR, context);
          return false;
        } else {
          currentIndex++;
          return true;
        }
      }

      // find state for that match
      var stateIndex = findStateIndexByName(selectedState);
      if (stateIndex !== null) {
        currentIndex = stateIndex;
        return true;
      }

      // no state matched
      done(NOT_FOUND + ':' + selectedState, context);
      return false;
    };

    // returns the index of the state with given name
    // or null if none is found
    var findStateIndexByName = function (name) {
      for (var j = 0; j < states.length; j++)
        if (states[j].name === name)
          return j;
      return null;
    };

    // calls the onentry function of the current state
    // followTransition is then called with the created event
    var executeCurrentState = function () {
      // find current state object
      if (currentIndex >= states.length)
        return followTransition(ERROR, 'no state for index: ' + currentIndex);
      var state = states[currentIndex];

      console.log('state:', state.name);

      // if the state has no onentry: emit event undefined
      if (!state.hasOwnProperty('onentry'))
        return followTransition();

      // if it has an onentry: emit whatever the function returns
      var onentry = state.onentry;
      try {
        onentry(context, function (event) {
          followTransition(event);
        });
      } catch (err) {
        followTransition(ERROR);
      }
    };

    executeCurrentState();

  };
};

// this function encapsulates a state machine into one state
// properties: an object describing the state (eg: name)
// states: an array of states
// returns a state, which processes all given states
var submachine = function (properties, states) {
  var newOnentry = machine(states);
  properties.onentry = function (context, done) {
    newOnentry(context, function (event) {
      if (event && event.indexOf(NOT_FOUND) === 0)
        return done(STATE + ':' + event.substr(NOT_FOUND.length + 1), context);
      else if (event === EXIT)
        return done(event, context);
      else
        return done(ERROR, context);
    });
  };
  return properties;
};

exports.machine    = machine;
exports.submachine = submachine;
