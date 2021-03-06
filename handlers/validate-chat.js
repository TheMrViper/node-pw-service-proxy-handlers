'use strict';

module.exports = function (options) {
    options = Object.assign({}, {
        count: 5,
        time: 1000,
        whitelist: []
    }, options || {});

    let banlist = {};
    let storage = {};

    setInterval(function () {
        storage = {};
    }, 1000 * 60 * 60);

    return {
        /**
         * @type {Array}
         */
        only: [0x4F, 0x12C3, 0x60, 0xE3],

        /**
         * @type {Array}
         */
        except: undefined,

        /**
         * @param {Object} packet
         * @param {Socket} input
         * @param {Socket} output
         * @param {Function} next
         */
        handler: function (packet, input, output, next) {
            packet.payload.setPointer(0);
            let roleid;
            let storageKey;

            if (0x4F === packet.opcode || 0x12C3 === packet.opcode) {
                roleid = storageKey = packet.payload.offset(2).readInt32BE();
            } else if (0x60 === packet.opcode) {
                let channel = packet.payload.readUInt8();
                let emotion = packet.payload.readUInt8();
                let src_name = packet.payload.readPwString();
                roleid = packet.payload.readInt32BE();
                let dst_name = packet.payload.readPwString();
                let dstroleid = packet.payload.readInt32BE();
                storageKey = 'pm_' + channel + '_' + roleid + '_' + dstroleid;

                if ('' === src_name) {
                    banlist[roleid] = true;
                }
            } else if (0xE3 === packet.opcode) {
                roleid = storageKey = packet.payload.offset(3).offset(packet.payload.readCUInt()).readInt32BE();
            } else {
                packet.payload.setPointer(0);
                return next();
            }

            packet.payload.setPointer(0);

            if (options.whitelist.indexOf(roleid) > -1) {
                return next();
            }

            if (banlist[roleid]) {
                return next(1);
            }

            if (!storage[storageKey]) {
                storage[storageKey] = {
                    tstamp: Date.now(),
                    count: 1
                };

                return next();
            }

            if (++storage[storageKey].count > options.count) {
                if (Date.now() - storage[storageKey].tstamp < options.time) {
                    console.log("\n[" + new Date().toLocaleString() + ']: ======= OOG Chat Flood =======');
                    console.log('Ban roleid:', roleid);
                    banlist[roleid] = true;
                    return next(1);
                }

                storage[storageKey] = {
                    tstamp: Date.now(),
                    count: 1
                };
            }

            next();
        }
    };
};
