'use strict';

var harmony = require('harmonyhubjs-client'),
    HarmonyHubDiscover = require('harmonyhubjs-discover'),
    discover = null;

function discoverHub(callBackFn) {
    if (discover === null) {
        discover = new HarmonyHubDiscover(61991);
    }
    discover.on('online', function (hub) {
        //console.log('discovered ' + hub.ip + '\n');
        callBackFn(hub.ip, true);
    });
    discover.on('offline', function (hub) {
        //console.log('lost ' + hub.ip);
        callBackFn(hub.ip, false);
    });
    discover.start();
}

function createHubClient(ip) {
    return harmony(ip);
}

function executeActivity(client, act, callBackFn) {
    client.getActivities()
        .then(function (activities) {
            activities.some(function (activity) {
                if (activity.label === act) {
                    var id = activity.id;
                    console.log("Starting Activity " + act);
                    client.startActivity(id);
                    client.end();
                    callBackFn(true);
                    return;
                }
                callBackFn(false);
            });
        });
}

function executeCommand(client, device, command, callBackFn) {
    client.getAvailableCommands()
        .then(function (commands) {
            var idx, dev;
            for (idx in commands.device) {
                dev = commands.device[idx];
                if (dev.label === device) {
                    dev.controlGroup.filter(function (group) {
                        group['function'].filter(function (action) {
                            var encodedAction, dt;
                            if (JSON.parse(action.action).command === command) {
                                console.log("Triggering On device " + device + " command " + command);
                                encodedAction = action.action.replace(/\:/g, '::');
                                dt = 'action=' + encodedAction + ':status=press';
                                console.log("Sending Action = " + dt);
                                client.send('holdAction', dt);
                                callBackFn(true);
                                return;
                            }
                        });
                    });
                    callBackFn(false);
                }
            }
        });
}

function readHubActivities(client, callBackFn) {
    client.getAvailableCommands()
        .then(function (commands) {
            var res = [], idx;
            for (idx in commands.activity) {
                res.push(commands.activity[idx].label);
                //console.log("Activity " + idx + " is : " + commands.activity[idx].label);
            }
            callBackFn(res);
        });
}

function readHubDevices(client, callBackFn) {
    client.getAvailableCommands()
        .then(function (commands) {
            var res = [], idx;
            for (idx in commands.device) {
                res.push(commands.device[idx].label);
                //console.log("Device " + idx + " is :" + commands.device[idx].label);
            }
            callBackFn(res);
        });
}


function readHubCommands(client, device, callBackFn) {
    client.getAvailableCommands()
        .then(function (commands) {
            var res = [], idx, dev;
            //console.log("Listing commands for :" + args.device);
            for (idx in commands.device) {
                dev = commands.device[idx];
                if (dev.label === device) {
                    dev.controlGroup.filter(function (group) {
                        group['function'].filter(function (action) {
                            //console.log("\t\t Commands  : " + action.action);
                            res.push(JSON.parse(action.action).command);
                        });
                    });
                }
            }
            callBackFn(res);
        });
}

module.exports = {
    readHubCommands : readHubCommands,
    readHubDevices : readHubDevices,
    readHubActivities : readHubActivities,
    executeCommand : executeCommand,
    discoverHub : discoverHub,
    createHubClient : createHubClient,
    executeActivity : executeActivity
};
