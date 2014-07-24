game.PlayScreen = me.ScreenObject.extend({
    zIndex        : 10,
    numInitiative : 0,
    numFeatures   : 0,
    numStories    : 0,
    numTasks      : 0,
    
    MAX_FEATURE_ROWS : 2,
    MAX_STORY_ROWS   : 3,
    MAX_TASK_ROWS    : 4,
    addedWithoutFeature : {},

    /**
     *  action to perform on state change
     */
    onResetEvent: function() {
        // Just load the level on page load
        // when data comes back fron the service, then show the ships, etc.
        me.levelDirector.loadLevel("area51");

        this.showLegend();

        // this.setupShips(); when you have data aggregated from the lbapi, use this
        // otherwise, act on a purely event-driven approach
        game.farRight = game.WIDTH;
        game.shipScreen = this;

        this.eventDrivenSetup();
    },

    eventDrivenSetup: function() {
        game.POSITION_MANAGER = new PositionManager(game.WIDTH, game.FEATURE_SHIP, game.STORY_SHIP, game.TASK_SHIP, game.PADDING + game.MOTHERSHIP.height);
        var scope = angular.element($("#root")).scope();
        
        var i = 0;
        setInterval(function() {
            if (!game.rallyShipOnScreen) {
                game.rallyShipOnScreen = me.pool.pull("rallyShip", -game.RALLY_SHIP.width + 1, 1, {
                    height: game.RALLY_SHIP.height,
                    image: 'rallyShip',
                    spriteheight: game.RALLY_SHIP.height,
                    spritewidth: game.RALLY_SHIP.width,
                    width: game.RALLY_SHIP.width,
                    z: Number.POSITIVE_INFINITY
                });

                me.game.world.addChild(game.rallyShipOnScreen, Number.POSITIVE_INFINITY);
            }
            game.cleanupOld();
        }, 10000);

        // create a new one
        var team = me.pool.pull("rallyHunter", 64, game.WINDOW_HEIGHT - 64, {
            image: "player_white",
            spriteheight: 64,
            spritewidth: 32,
            width: 32,
            height: 64,
            z: Number.POSITIVE_INFINITY,
            type: game.PLAYER,
            team: game.SPECIAL_TEAM
        });
        game.canShoot[game.SPECIAL_TEAM] = true;
        game.TEAM_SHIPS[game.SPECIAL_TEAM] = team;

        me.game.world.addChild(team, Number.POSITIVE_INFINITY);
        scope.eventHandler.playThrough();
    },

    addInitiative: function(record, oid, date) {
        if (this.numInitiative < 1) {
            console.info("putting initiative at x: " + (game.WIDTH / 2 - game.MOTHERSHIP.width / 2) + " y: " + game.PADDING, game.WIDTH, game.MOTHERSHIP);   
            this.addEnemy(record, oid, date, "new_super", game.ENEMY_ENTITY_SUPER, game.MOTHERSHIP.height, game.MOTHERSHIP.width, game.WIDTH / 2 - game.MOTHERSHIP.width, game.PADDING);
            this.numInitiative = 1;
            game.initiative = record;  
            console.log(game.INITIATIVE_SHIP);           
        }
    },  

    addFeature: function(record, oid, date, pt) {
        var point = pt && typeof pt == "object" ? pt : game.POSITION_MANAGER.getFeaturePosition();
        if (point) {
            var color = game.featureColorMap[oid];
            if (!color) {
                color = game.FEATURE_SHIP_COLORS[game.FEATURE_SHIP_COLOR_INDEX % game.FEATURE_SHIP_COLORS.length];
                game.FEATURE_SHIP_COLOR_INDEX++;
                game.featureColorMap[oid] = color;
            }
            if (!game.OID_MAP[oid] || !game.OID_MAP[oid].ship) {
                this.addEnemy(record, oid, date, "new_large", game.ENEMY_ENTITY_LARGE, game.FEATURE_SHIP.height, game.FEATURE_SHIP.width, point.x, point.y);
                this.numFeatures++;
            }
            
        } else {
            if (!game.OID_MAP[oid] || !game.OID_MAP[oid].swapped) {
                game.log.addItem(record.get('Name') + " created", date, 'created');
            }
            game.OID_MAP[oid] = {
                formattedId: record.get('FormattedID'),
                record: record,
                date: date
            };
            game.POSITION_MANAGER.addPending(oid, "PortfolioItem/Feature");
        }
    },

    addStory: function(record, oid, date, pt) {
        //console.log("add story");
        if (record.get('ObjectID') != oid) {
            console.error("object id not equal to oid", record, oid);
            return;
        }
        if (game.OID_MAP[oid] && game.OID_MAP[oid].ship) {
            return;
        }
        var featureOid = record.get('Feature');
        var x = 0;
        var color = 'medium';
        if (game.OID_MAP[featureOid] && game.OID_MAP[featureOid].ship) {
            x = game.OID_MAP[featureOid].ship.startingX;
            color = 'medium_' + game.featureColorMap[featureOid] || 'medium';
        }

        var point = pt && typeof pt == "object" ? pt : game.POSITION_MANAGER.getStoryPosition(x);
        if (point) {
            if (!game.OID_MAP[oid] || !game.OID_MAP[oid].ship) {
                this.addEnemy(record, oid, date, "new_medium", game.ENEMY_ENTITY_MEDIUM, game.STORY_SHIP.height, game.STORY_SHIP.width, point.x, point.y, featureOid);
                this.numStories++;
            }
        } else {
            if (!game.OID_MAP[oid] || !game.OID_MAP[oid].swapped) {
                game.log.addItem(record.get('Name') + " created", date, 'created');
            }
            game.OID_MAP[oid] = {
                formattedId: record.get('FormattedID'),
                record: record,
                date: date
            };
            game.POSITION_MANAGER.addPending(oid, "HierarchicalRequirement");
        }

        game.getTeam(record.get('Project'));
    },

    addTask: function(record, oid, date, pt) {
        //console.log("add task");
        var featureOid = record.get('Feature');
        var x = 0;
        var color = 'small';
        if (game.OID_MAP[featureOid] && game.OID_MAP[featureOid].ship) {
            x = game.OID_MAP[featureOid].ship.startingX;
            color = 'small_' + game.featureColorMap[featureOid] || 'small';
        }

        var point = pt && typeof pt == "object" ? pt : game.POSITION_MANAGER.getTaskPosition(x);
        if (point) {
            if (!game.OID_MAP[oid] || !game.OID_MAP[oid].ship) {
                this.addEnemy(record, oid, date, "new_small", game.ENEMY_ENTITY_SMALL, game.TASK_SHIP.height, game.TASK_SHIP.width, point.x, point.y, featureOid);
                this.numStories++;
            }
        } else {
            if (!game.OID_MAP[oid] || !game.OID_MAP[oid].swapped) {
                game.log.addItem(record.get('Name') + " created", date, 'created');
            }
            game.OID_MAP[oid] = {
                formattedId: record.get('FormattedID'),
                record: record,
                date: date
            };
            game.POSITION_MANAGER.addPending(oid, "Task");
        }
        
    },

    recycleShip: function(oid, date) {
        var obj = game.OID_MAP[oid];
        if (obj && obj.ship) {
            var ship = obj.ship;
            if (ship.type == game.ENEMY_ENTITY_LARGE) {
                // remove all children of the feature
                var remove = [];
                var pendingRemove = [];
                _.each(game.OID_MAP, function(entry, key) {
                    if (entry.ship && entry.ship.featureOid == oid) {
                        remove.push(entry.ship);
                    } else if (entry.record && entry.record.get('Feature') == oid) {
                        pendingRemove.push(entry.record.get('ObjectID'));
                    }
                });
                _.each(remove, function(ship) {
                    ship.flyOff();
                });

                _.each(pendingRemove, function(pendingOid) {
                    game.POSITION_MANAGER.removePending(pendingOid, "HierarchicalRequirement");
                });
            } else if (ship.type == game.ENEMY_ENTITY_MEDIUM) {
                var children = ship.record.get('Children');
                if (children) {
                    _.each(children, function(childOid) {
                        var entity = game.OID_MAP[childOid];
                        if (entity && entity.ship) {
                            entity.ship.flyOff();
                        }
                    });
                }
            }

            if (ship.flyOff) {
                ship.flyOff(); // also adds this point back as available
            }
        } else if (obj && obj.record) {
            game.POSITION_MANAGER.removePending(oid);
            game.log.addItem(obj.record.get('Name') + " recycled", date, 'recycled');
        }
    },

    updateInitiative: function(record, oid, date) {
        //console.log("update initiative");
        if (game.INITIATIVE_SHIP) {
            game.INITIATIVE_SHIP.record = record;
        }

        var endDate = record.get('ActualEndDate');
        if (!game.endDate && endDate) {
            game.endDate = moment(endDate);
            game.historyFinishedData = {
                oid: oid
            }
            console.log("Completed initiative at " + game.endDate);
            game.historyFinished();
        }
        

        var obj = game.OID_MAP[oid];
        if (obj && obj.ship) {
            var ship = obj.ship;
            ship.record = record;
        } else if (obj && obj.record) {
            game.OID_MAP[oid].record = record;
        }
    },

    updateFeature: function(record, oid, date) {
        //console.log("update feature");
        var obj = game.OID_MAP[oid];
        if (obj && obj.ship) {
            var ship = obj.ship;
            ship.record = record;
            var endDate = record.get('ActualEndDate');
            if (!obj.targeted && endDate && moment(endDate).isBefore(moment())) {
                var teamShip = game.getTeam(record.get('Project'));
                if (teamShip) {
                    ship.team = record.get('Project');
                    var children = me.game.world.getChildByProp("featureOid", oid);
                    // Add all remaining shown children as targets first
                    _.each(children, function(child) {
                        teamShip.addTarget(child);
                    });
                    teamShip.addTarget(ship);
                }
            }
        } else if (obj && obj.record) {
            if (endDate && moment(endDate).isBefore(moment())) {
                // see if you can swap this record with one that is currently on the screen
                var possibleShips = me.game.world.getChildByProp('type', game.ENEMY_ENTITY_LARGE);
                if (possibleShips && possibleShips.length > 0) {
                    var match = _.find(possibleShips, function(oneShip) {
                        if (game.OID_MAP[oneShip] && !game.OID_MAP[oneShip.objectID].targeted && game.OID_MAP[oneShip.objectID].ship)  {
                            return oneShip;
                        }
                    });

                    if (match) {
                        // swap records
                        var temp = game.OID_MAP[oid];

                        // update the displayed in the oid map
                        game.OID_MAP[match.objectID].record = match.record;
                        game.OID_MAP[match.objectID].date = match.date;
                        game.OID_MAP[match.objectID].ship = null;
                        game.OID_MAP[match.objectID] = temp;

                        // update the ship
                        match.objectID = oid;
                        match.date = date;
                        match.record = record;

                        // update this in the oidmap
                        game.OID_MAP[oid].record = null;
                        game.OID_MAP[oid].ship = match;
                        game.OID_MAP[oid].date = date;
                        var teamShip = game.getTeam(record.get('Project'));
                        if (teamShip) {
                            teamShip.addTarget(match);
                        }

                        console.log("SWAPPED!");
                        return;
                    }
                }
                // oh well, we tried to make it more fun!

                ////
                var projectName = game.PROJECT_MAPPING[record.get('Project')];
                var pointsEarned = record.get('PlanEstimate');
                var time = moment(date).format("MM-DD-YY HH:mm", 'completed');
                game.log.addCompletedItem(record, projectName, pointsEarned, time);
                game.scoreboard.addPoints(record.get('Project'), pointsEarned);
                ////

                game.removeOidFromMap(oid, false);
            } else {
                game.OID_MAP[oid].record = record;
            }
        }
    },

    updateStory: function(record, oid, date) {
        //console.log("update story");
        var feature = record.get('Feature');
        var state = record.get('ScheduleState');
        var obj = game.OID_MAP[oid];

        if (obj && obj.ship) {
            var ship = obj.ship;
            ship.record = record;
            ship.date = date;
            if (!obj.targeted && (state == "Completed" || state == "Accepted" || state == "Released")) {
                var children = record.get('Children');

                var teamShip = game.getTeam(record.get('Project'));
                var teamOid = record.get('Project');
                if (teamShip) {
                    if (children) {
                        _.each(children, function(child) {
                            var childShip = game.OID_MAP[child];
                            if (childShip && childShip.ship) {
                                childShip.team = teamOid;
                                teamShip.addTarget(childShip);
                            }
                            // TODO also check pending ships?
                        });
                    }
                    ship.team = teamOid;
                    teamShip.addTarget(ship);
                }
            }
        } else if (obj && obj.record) {
            if ((state == "Completed" || state == "Accepted" || state == "Released")) {

                var possibleShips = me.game.world.getChildByProp('type', game.ENEMY_ENTITY_MEDIUM);
                if (possibleShips && possibleShips.length > 0) {
                    var match = _.find(possibleShips, function(oneShip) {
                        if (game.OID_MAP[oneShip.objectID] && !game.OID_MAP[oneShip.objectID].targeted && game.OID_MAP[oneShip.objectID].ship)  {
                            return oneShip;
                        }
                    });

                    if (match) {
                        // update the displayed in the oid map
                        game.OID_MAP[match.objectID].record = match.record;
                        game.OID_MAP[match.objectID].date = match.date;
                        game.OID_MAP[match.objectID].ship = null;
                        game.OID_MAP[match.objectID].swapped = oid;

                        // update the ship
                        match.objectID = oid;
                        match.date = date;
                        match.record = record;

                        // update this in the oidmap
                        game.OID_MAP[oid].record = null;
                        game.OID_MAP[oid].ship = match;
                        game.OID_MAP[oid].date = date;
                        var teamShip = game.getTeam(record.get('Project'));
                        if (teamShip) {
                            teamShip.addTarget(match);
                        }

                        console.log("SWAPPED!");
                        return;
                    } else {
                        console.log("NO MATCH, COULD NOT SWAP");
                    }
                } else {
                    console.log("NONE POSSIBLE, COULD NOT SWAP", possibleShips);
                }
                
                // oh well, we tried to make it more fun!

                ////
                var projectName = game.PROJECT_MAPPING[record.get('Project')];
                var pointsEarned = record.get('PlanEstimate');
                var time = moment(date).format("MM-DD-YY HH:mm", 'completed');
                game.log.addCompletedItem(record, projectName, pointsEarned, time);
                game.scoreboard.addPoints(record.get('Project'), pointsEarned);
                ////

                game.removeOidFromMap(oid, false);
            } else {
                game.OID_MAP[oid].record = record;
            }
        }
    },

    updateTask: function(record, oid, date) {
        // TODO swap if not shown - we have yet to see a situation where this would matter, but maybe they use a tonnnn or tasks
        this.updateShip(record, oid, date, function(rec) {
            return rec.get('State') == "Completed";
        });
    },

    updateShip: function(record, oid, date, shouldAddTarget) {
        var obj = game.OID_MAP[oid];
        if (obj && obj.ship) {
            var ship = obj.ship;
            ship.record = record;
            if (!obj.targeted && shouldAddTarget(record)) {
                var teamShip = game.getTeam(record.get('Project'));
                if (teamShip) {
                    ship.team = record.get('Project')
                    teamShip.addTarget(ship);
                }
            }
        } else if (obj && obj.record) {
            if (shouldAddTarget(record)) {

                ////
                var projectName = game.PROJECT_MAPPING[record.get('Project')];
                var pointsEarned = record.get('PlanEstimate');
                var time = moment(date).format("MM-DD-YY HH:mm", 'completed');
                game.log.addCompletedItem(record, projectName, pointsEarned, time);
                game.scoreboard.addPoints(record.get('Project'), pointsEarned);
                ////

                game.removeOidFromMap(oid, false);
            } else {
                game.OID_MAP[oid].record = record;
            }
        }
    },

    addEnemy: function(record, oid, date, image, type, height, width, x, y, featureOid) {
        var shipSettings = {
            height: height,
            image: image,
            spriteheight: height,
            spritewidth: width,
            width: width * 2,   
            objectID: oid,
            z: this.zIndex,
            type: type,
            date: date,
            record: record
        };

        if (featureOid) {
            shipSettings.featureOid = featureOid;
        }

        var ship = me.pool.pull("enemyShip", x, y, shipSettings);

        if (image == 'new_super') {
            game.INITIATIVE_SHIP = ship;
        }

        if (!game.OID_MAP[oid] || !game.OID_MAP[oid].swapped) {
            game.log.addItem(record.get('Name') + " created", date, 'created');
        }
        
        game.OID_MAP[oid] = {
            formattedId: record.get('FormattedID'),
            ship: ship,
            targeted: false
        };

        me.game.world.addChild(ship, this.zIndex++);
    },

    showLegend: function() {
        function changeShip(num) {
            var ships = $('.shipContainer');
            if (num >= ships.length) {
                num = 0;
            }

            $(ships[num]).fadeIn().delay(5000).fadeOut(function() {
                 changeShip(num + 1);
             });
        }
        $('.shipContainer.logo').hide();
        changeShip(1);
    },

    /**
     *  action to perform when leaving this screen (state change)
     */
    onDestroyEvent: function() {
        // remove all remaining ships
        _.each(game.OID_MAP, function(element, index, list) {
            if (element.ship) {
                destroy = element.ship;
                var offset;
                switch (destroy.type) {
                    case game.ENEMY_ENTITY_LARGE:
                        offset = 'LARGE';
                        break;

                    case game.ENEMY_ENTITY_MEDIUM:
                        offset = 'MEDIUM'; 
                        break;
                    default: offset = 'SMALL';
                }
                game.VICTORY_ANIMATIONS[offset].push(new Point(destroy.pos.x + destroy.width / 2, destroy.pos.y + destroy.height / 2));

                me.game.world.removeChild(destroy);
            }
        });
        var scope = angular.element($("#root")).scope();
        scope.eventHandler.stopEvents();
    }
});
