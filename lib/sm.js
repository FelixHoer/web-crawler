// Author: Felix Hoerandner (2014)

if (typeof setImmediate === 'undefined')
  var setImmediate = function () {
    var args = Array.prototype.slice.call(arguments);
    var fun = args.shift();
    setTimeout(function () {
      fun.apply(null, args);
    }, 1);
  };

var createStateMachine = function (machine) {
  return function (context, done) {

    var moveToState = function (state, event) {
      if (!state.hasOwnProperty('transitions'))
        return done('error', 'current state has no transitions');
      var transitions = state['transitions'];

      if (!transitions.hasOwnProperty(event))
        return done('error', 'no transition matches the event: ' + event);
      var transition = transitions[event];

      setImmediate(function () { executeState(transition); });
    };

    var executeState = function (stateName) {
      console.log('state:', stateName);

      for (var key in types)
        if (types.hasOwnProperty(key))
          if (types[key](stateName))
            return execute[key](stateName);

      return done('error', 'invalid state type: ' + stateName);
    };

    var types = {
      'normal-state': function (name) {
        return name !== 'final' &&
               machine.hasOwnProperty(name) &&
               machine[name].hasOwnProperty('transitions');
      },
      'state-machine': function (name) {
        return machine.hasOwnProperty(name) &&
               machine[name].hasOwnProperty('initial');
      },
      'final-state': function (name) {
        return name === 'final';
      }
    };

    var execute = {
      'normal-state': function (stateName) {
        var state = machine[stateName];

        if (!state.hasOwnProperty('onentry'))
          setImmediate(function () { moveToState(state, 'undefined') });
        else
          state['onentry'](context, function (event) {
            setImmediate(function () { moveToState(state, '' + event); });
          });
      },

      'state-machine': function (stateName) {
        var sm = createStateMachine(machine[stateName]);
        sm(context, function (event, context) {
          if (machine[stateName].hasOwnProperty('final'))
            setImmediate(function () {
              moveToState(machine[stateName]['final'], '' + event);
            });
          else
            done('error', 'no matching transition');
        });
      },

      'final-state': function (stateName) {
        if (machine.hasOwnProperty(stateName) &&
            machine[stateName].hasOwnProperty('onentry'))
          machine[stateName]['onentry'](context, function (event) {
            done(event, context);
          });
        else
          done(undefined, context);
      }
    };

    executeState('initial');

  };
};

exports.createStateMachine = createStateMachine;
