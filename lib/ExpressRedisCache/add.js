module.exports = (function () {
  "use strict";

  var config = require("../../package.json").config;

  /**  Add
   *
   *  @function
   *  @description Add a new cache entry
   *  @return void
   *  @callback
   *  @arg {String} name - The cache entry name
   *  @arg {String} body - The cache entry body
   *  @arg {Object} options - Optional { type: String, expire: Number, status: Number }
   *  @arg {Number} expire - The cache life time in seconds [OPTIONAL]
   *  @arg {Function} callback
   */

  function add(name, body, options, callback) {
    var self = this;

    /** Adjust arguments in case @options is omitted **/
    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    var domain = require("domain").create();

    domain.on(
      "error",
      domain.bind(function (error) {
        self.emit("error", error);
        self.writeClientConnected = false;
        self.readClientConnected = false;
        callback(error);
      })
    );

    domain.run(function () {
      if (
        self.writeClientConnected === false ||
        self.readClientConnected === false
      ) {
        return callback(null, []); // simulate cache miss
      }

      /** The new cache entry **/
      var entry = {
        body: body,
        type: options.type || config.type,
        status: options.status || 200,
        touched: +new Date(),
        expire:
          typeof options.expire !== "undefined" && options.expire !== false
            ? options.expire
            : self.expire,
      };

      var size = require("../sizeof")(entry);

      var prefix = self.prefix.match(/:$/)
        ? self.prefix.replace(/:$/, "")
        : self.prefix;

      /* Save as a Redis hash */
      var redisKey = prefix + ":" + name;
      self.writeClient
        .hSet(redisKey, entry)
        .then(function (res) {
          var calculated_size = (size / 1024).toFixed(2);
          /** If @expire then tell Redis to expire **/
          if (typeof entry.expire === "number" && entry.expire > 0) {
            return self.writeClient
              .expire(redisKey, +entry.expire)
              .then(function () {
                self.emit(
                  "message",
                  require("util").format(
                    "SET %s ~%d Kb %d TTL (sec)",
                    redisKey,
                    calculated_size,
                    +entry.expire
                  )
                );
                callback(null, name, entry, res);
              });
          } else {
            self.emit(
              "message",
              require("util").format("SET %s ~%d Kb", redisKey, calculated_size)
            );
            callback(null, name, entry, res);
          }
        })
        .catch(function (error) {
          self.emit("error", error);
          self.writeClientConnected = false;
          self.readClientConnected = false;
          callback(error);
        });
    });
  }

  return add;
})();
