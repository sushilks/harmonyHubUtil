'use strict';
/*jslint nomen: true */
var harmony = require('harmonyhubjs-client'),
    debug = require('debug')('harmonyHub:util'),
    EventEmitter = require('events').EventEmitter,
    Q = require('q'),
    harmonyClient;


function HarmonyHubUtil(ip) {
    var self = this,
        deferred = Q.defer();

    harmony(ip).then(function (client) {
        self._harmonyClient = client;
        deferred.resolve(self);
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise;
}
function end() {
    this._harmonyClient.end();
    this._harmonyClient = undefined;
}

function readCurrentActivity() {
    var deferred = Q.defer(),
        self = this;

    self._harmonyClient.getCurrentActivity().then(function (current_activity_id) {
        self._harmonyClient.getAvailableCommands()
            .then(function (commands) {
                commands.activity.filter(function (act) {
                    if (act.id === current_activity_id) {
                        deferred.resolve(act.label);
                        return;
                    }
                });
                deferred.reject('unable to find.');
            });
    });
    return deferred.promise;
}

function executeActivity(act) {
    var deferred = Q.defer(),
        self = this;

    self._harmonyClient.getActivities()
        .then(function (activities) {
            activities.some(function (activity) {
                if (activity.label === act) {
                    var id = activity.id;
                    console.log("Starting Activity " + act + " id:" + id);
                    self._harmonyClient.startActivity(id);
                    deferred.resolve(true);
                    return true;
                }
            });
            //deferred.reject('cant find activity [' + act + ']');
        });
    return deferred.promise;
}


function executeDeviceCommandListDF(deferred, dev, device, commandList) {
    var self = this;
    var command = commandList.shift();
    dev.controlGroup.filter(function (group) {
        group['function'].filter(function (action) {
            var encodedAction, dt;
            if (JSON.parse(action.action).command === command) {
                console.log("Triggering On device " + device + " command " + command);
                encodedAction = action.action.replace(/\:/g, '::');
                var dt_press = 'action=' + encodedAction + ':status=press';
                var dt_release = 'action=' + encodedAction + ':status=release';

                self._harmonyClient.send('holdAction', dt_press).then(function () {
                    self._harmonyClient.send('holdAction', dt_release).then(function () {
                        if (commandList.length == 0) {
                            deferred.resolve(true);
                        } else {
                            setTimeout(function() {
                                self._executeDeviceCommandListDF(deferred, dev, device, commandList);
                            }, 100);
                        }
                    });
                });
                return;
            }
        });
    });
}
function executeDeviceCommandList(device, commandList) {
    var deferred = Q.defer(),
        self = this;
    self._harmonyClient.getAvailableCommands()
        .then(function (commands) {
            commands.device.filter(function (dev) {
                if (dev.label === device) {
                    return self._executeDeviceCommandListDF(deferred, dev, device, commandList)
                }
            });
        });
    return deferred.promise;
}
function executeDeviceCommand(device, command) {
    var a = []
    a.push(command)
    return this._executeDeviceCommandList(device, a)
}

function executeActivityCommandListDF(deferred, act, activity, commandList) {
    var self = this,
        command = commandList.shift(),
        cmd = command.split(',');
    act.controlGroup.filter(function (cg) {
            if (cg.name === cmd[0]) {
                cg.function.filter(function (fn) {
                    var dt, encodedAction;
                    if (fn.label === cmd[1]) {
                        console.log("Triggering On Activity " + activity + " command " + command);
                        encodedAction = fn.action.replace(/\:/g, '::');
                        var dt_press = 'action=' + encodedAction + ':status=press';
                        var dt_release = 'action=' + encodedAction + ':status=release';
                        //console.log("\tSending Action = " + dt);
                        self._harmonyClient.send('holdAction', dt_press).then(function () {
                            self._harmonyClient.send('holdAction', dt_release).then(function () {
                                if (commandList.length == 0) {
                                    deferred.resolve(true);
                                } else {
                                    return setTimeout(function () {
                                        self._executeActivityCommandListDF(deferred, act, activity, commandList);
                                    },100);
                                }
                            });
                        });
                        return;
                    }
                });
            }
    });
}

function executeActivityCommandList(activity, commandList) {
    var deferred = Q.defer(),
        self = this;
    self._harmonyClient.getAvailableCommands()
        .then(function (commands) {
            commands.activity.filter(function (act) {
                if (act.label === activity) {
                    return self._executeActivityCommandListDF(deferred, act, activity, commandList)
                }
            });
        });
    return deferred.promise;
}
function executeActivityCommand(activity, command) {
    var a = []
    a.push(command)
    return this._executeActivityCommandList(activity, a)
}

function executeCommand(cmd_is_for_device, act_or_dev_name, command) {
    console.log('execute command received ')
    if (cmd_is_for_device) {
        if (Array.isArray(command)) {
            return this._executeDeviceCommandList(act_or_dev_name, command);
        } else {
            return this._executeDeviceCommand(act_or_dev_name, command);
        }
    }
    if (Array.isArray(command)) {
        return this._executeActivityCommandList(act_or_dev_name, command);
    } else {
        return this._executeActivityCommand(act_or_dev_name, command);
    }
}

function readActivities() {
    var deferred = Q.defer(),
        self = this;

    self._harmonyClient.getAvailableCommands()
        .then(function (commands) {
            var res = [];
            commands.activity.filter(function (act) {
                res.push(act.label);
            });
            deferred.resolve(res);
        });
    return deferred.promise;
}

function readDevices() {
    var deferred = Q.defer(),
        self = this;

    self._harmonyClient.getAvailableCommands()
        .then(function (commands) {
            var res = [];
            commands.device.filter(function (dev) {
                res.push(dev.label);
            });
            deferred.resolve(res);
        });
    return deferred.promise;
}


function readDeviceCommands(device) {
    var deferred = Q.defer(),
        self = this;

    self._harmonyClient.getAvailableCommands()
        .then(function (commands) {
            var res = [];
            commands.device.filter(function (dev) {
                if (dev.label === device) {
                    dev.controlGroup.filter(function (group) {
                        group['function'].filter(function (action) {
                            //console.log("\t\t Commands  : " + action.action);
                            res.push(JSON.parse(action.action).command);
                        });
                    });
                    deferred.resolve(res);
                    return;
                }
            });
        });
    return deferred.promise;
}

function readActivityCommands(activity) {
    var deferred = Q.defer(),
        self = this;

    self._harmonyClient.getAvailableCommands()
        .then(function (commands) {
            var res = [];
            commands.activity.filter(function (act) {
                if (act.label === activity) {
                    act.controlGroup.filter(function (cg) {
                        cg.function.filter(function (fn) {
                            res.push([cg.name, fn.label]);
                            //console.log('  ' + cg.name + ' :: ' + fn.label);
                        });
                    });
                    deferred.resolve(res);
                    return;
                }
            });
        });
    return deferred.promise;
}

function readCommands(read_is_for_device, act_or_dev_name) {
    if (read_is_for_device) {
        return this._readDeviceCommands(act_or_dev_name);
    }
    return this._readActivityCommands(act_or_dev_name);
}


HarmonyHubUtil.prototype._readDeviceCommands = readDeviceCommands;
HarmonyHubUtil.prototype._readActivityCommands = readActivityCommands;
HarmonyHubUtil.prototype._executeDeviceCommand = executeDeviceCommand;
HarmonyHubUtil.prototype._executeDeviceCommandList = executeDeviceCommandList;
HarmonyHubUtil.prototype._executeDeviceCommandListDF = executeDeviceCommandListDF;
HarmonyHubUtil.prototype._executeActivityCommand = executeActivityCommand;
HarmonyHubUtil.prototype._executeActivityCommandList = executeActivityCommandList;
HarmonyHubUtil.prototype._executeActivityCommandListDF = executeActivityCommandListDF;

HarmonyHubUtil.prototype.readCurrentActivity = readCurrentActivity;
HarmonyHubUtil.prototype.readCommands = readCommands;
HarmonyHubUtil.prototype.readDevices = readDevices;
HarmonyHubUtil.prototype.readActivities = readActivities;
HarmonyHubUtil.prototype.executeCommand = executeCommand;
HarmonyHubUtil.prototype.executeActivity = executeActivity;
HarmonyHubUtil.prototype.end = end;


module.exports = HarmonyHubUtil;
