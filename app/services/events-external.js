import Service, { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import io from 'socket.io-client';
import { htmlSafe } from '@ember/template';
import { sort } from '@ember/object/computed';

export default class EventsExternalService extends Service {
  @service globalConfig;
  @service queueHandler;
  @service store;

  @tracked type = null;
  @tracked token = null;
  @tracked client = null;

  // @tracked connected = false;

  @tracked connected = false;

  @action createClient() {
    if (
      this.type &&
      this.token &&
      this.client === null &&
      this.connected === false
    ) {
      if (this.type === 'StreamLabs') {
        // No matter how hard you try, only socked.io v 2.4.0 works.
        this.client = io(`https://sockets.streamlabs.com?token=${this.token}`, {
          transports: ['websocket'],
        });
        this.streamLabsEvents(this.client);
      }

      if (this.type === 'StreamElements') {
        this.client = io('https://realtime.streamelements.com', {
          transports: ['websocket'],
        });
        this.streamElementEvents(this.client, this.token);
      }
    }
  }

  @action disconnectClient() {
    this.client.close();
    this.client = null;
  }

  @action streamElementEvents(client, token) {
    client.on('connect', () => {
      console.debug('Successfully connected to the websocket');
      client.emit('authenticate', {
        method: 'jwt',
        token: token,
      });
    });

    // Socket got disconnected
    client.on('disconnect', () => {
      console.debug('Disconnected from websocket');
      this.connected = false;
      //this.set('connected', false);
      // Reconnect
    });

    // Socket is authenticated
    client.on('authenticated', (data) => {
      var { channelId } = data;
      //this.set('connected', true);
      this.connected = true;
      console.debug(`Successfully connected to channel ${channelId}`);
    });

    client.on('event:test', (data) => {
      // Structure as on JSON Schema
      var outputmessage = '';
      var type = '';
      console.debug('Event detected');
      switch (data.listener) {
        case 'follower-latest': {
          console.debug('Follow');
          //console.debug(data.event);
          outputmessage = data.event.name + ' Followed the stream.';
          type = 'follow';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'subscriber-latest': {
          console.debug('Subscription');
          console.debug(data.event);

          if (data.event.bulkGifted) {
            outputmessage =
              data.event.sender +
              ' gifted ' +
              data.event.amount +
              ' subs to community.';
          } else {
            if (data.event.gifted && data.event.sender) {
              outputmessage =
                data.event.sender +
                ' gifted a sub to ' +
                data.event.name +
                ' who ';
            } else {
              outputmessage = data.event.name + ' ';
            }
            if (data.event.count > 1) {
              outputmessage = outputmessage.concat('resubscribed with ');
              type = 'resub';
            } else {
              outputmessage = outputmessage.concat('subscribed with ');
              type = 'sub';
            }
            var tier = '';
            if (data.event.tier === 1000) {
              tier = 'Tier 1';
            }
            if (data.event.tier === 2000) {
              tier = 'Tier 2';
            }
            if (data.event.tier === 3000) {
              tier = 'Tier 3';
            }
            if (data.event.tier === 'prime') {
              tier = 'Prime';
            }

            outputmessage = outputmessage.concat(
              tier + ' for ' + data.event.count + ' months!',
            );
            if (data.event.message != '') {
              outputmessage = outputmessage.concat(
                ' Message: ' + data.event.message,
              );
            }
          }
          if (data.event.gifted || data.event.amount === 'gifted') {
            type = 'gift';
          }
          if (data.event.bulkGifted) {
            type = 'bulk';
          }

          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'tip-latest': {
          console.debug('Tip');
          outputmessage =
            data.event.name + ' donated ' + data.event.amount + '!';
          if (data.event.message) {
            outputmessage = outputmessage.concat(
              ' Message: ' + data.event.message,
            );
          }
          type = 'donation';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'cheer-latest': {
          console.debug('Cheer');
          outputmessage =
            data.event.name + ' cheered ' + data.event.amount + ' bits!';
          if (data.event.message) {
            outputmessage = outputmessage.concat(
              ' Message: ' + data.event.message,
            );
          }
          type = 'cheer';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'raid-latest': {
          console.debug('Raid');
          outputmessage =
            data.event.name + ' raided with ' + data.event.amount + ' raiders!';
          type = 'raid';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'host-latest': {
          console.debug('Host');
          outputmessage =
            data.event.name + ' hosted with ' + data.event.amount + ' viewers!';
          type = 'host';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'redemption-latest': {
          console.debug('Redemption');
          outputmessage =
            data.event.name + ' redeemed a ' + data.event.item + '!';
          if (data.event.message) {
            outputmessage = outputmessage.concat(
              ' Message: ' + data.event.message,
            );
          }
          console.debug(outputmessage);
          type = 'redemption';
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'merch-latest': {
          console.debug('Merch');
          outputmessage = data.event.name + ' purchased merch!';
          type = 'merch';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }

        default: {
          break;
        }
      }
    });

    client.on('event', (data) => {
      // console.debug(data);
      // Structure as on JSON Schema
      var outputmessage = '';
      var type = '';
      switch (data.listener) {
        case 'follower-latest': {
          console.debug('Follow');
          //console.debug(data.event);
          outputmessage = data.event.name + ' has followed.';
          type = 'follow';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'subscriber-latest': {
          console.debug('Subscription');
          console.debug(data.event);
          if (data.event.gifted && data.event.sender) {
            outputmessage =
              data.event.sender +
              ' gifted a sub to ' +
              data.event.name +
              ' who ';
          } else {
            outputmessage = data.event.name + ' ';
          }

          if (data.event.amount > 1) {
            outputmessage = outputmessage.concat(
              'resubscribed x' + data.event.amount + ' with ',
            );
            type = 'resub';
          } else {
            outputmessage = outputmessage.concat('subscribed with ');
            type = 'sub';
          }
          if (data.event.gifted || data.event.amount === 'gifted') {
            type = 'gift';
          }

          var tier = '';
          if (data.event.tier === 1000) {
            tier = 'Tier 1';
          }
          if (data.event.tier === 2000) {
            tier = 'Tier 2';
          }
          if (data.event.tier === 3000) {
            tier = 'Tier 3';
          }
          if (data.event.tier === 'prime') {
            tier = 'Prime';
          }

          outputmessage = outputmessage.concat(
            tier + ' for ' + data.event.count + ' months!',
          );
          if (data.event.message != '') {
            outputmessage = outputmessage.concat(
              ' Message: ' + data.event.message,
            );
          }

          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'tip-latest': {
          console.debug('Tip');
          outputmessage =
            data.event.name + ' donated ' + data.event.amount + '!';
          if (data.event.message) {
            outputmessage = outputmessage.concat(
              ' Message: ' + data.event.message,
            );
          }
          type = 'donation';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'cheer-latest': {
          console.debug('Cheer');
          outputmessage =
            data.event.name + ' cheered ' + data.event.amount + ' bits!';
          if (data.event.message) {
            outputmessage = outputmessage.concat(
              ' Message: ' + data.event.message,
            );
          }
          type = 'cheer';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'raid-latest': {
          console.debug('Raid');
          outputmessage =
            data.event.name + ' raided with ' + data.event.amount + ' raiders!';
          type = 'raid';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'host-latest': {
          console.debug('Host');
          outputmessage =
            data.event.name + ' hosted with ' + data.event.amount + ' viewers!';
          type = 'host';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'redemption-latest': {
          console.debug('Redemption');
          outputmessage =
            data.event.name + ' redeemed a ' + data.event.item + '!';
          if (data.event.message) {
            outputmessage = outputmessage.concat(
              ' Message: ' + data.event.message,
            );
          }
          console.debug(outputmessage);
          type = 'redemption';
          this.eventHandler(outputmessage, type);
          break;
        }
        case 'merch-latest': {
          console.debug('Merch');
          outputmessage = data.event.name + ' purchased merch!';
          type = 'merch';
          console.debug(outputmessage);
          this.eventHandler(outputmessage, type);
          break;
        }

        default: {
          break;
        }
      }
    });
  }

  @action streamLabsEvents(client) {
    console.debug('Connecting to streamlabs...');
    client.on('connect', () => {
      console.debug('Successfully connected to the websocket');
      this.connected = client.connected;
    });

    client.on('disconnect', (err) => {
      console.debug('Disconnected from websocket');
      this.connected = false;
      console.debug(err);
    });

    client.on('error', (err) => {
      console.debug(err);
    });

    client.on('event', (data) => {
      console.debug('SLAB Data: ', data);
      try {
        if (Array.isArray(data.message)) {
          data.message.forEach((event) => {
            //console.log(event);
            var outputmessage = '';
            var type = '';
            event.id = data.event_id;
            if (data.for) {
              if (data.for.includes('youtube')) {
                event.platform = 'youtube';
              } else if (data.for.includes('twitch')) {
                event.platform = 'twitch';
              } else {
                event.platform = data.for || 'streamlabs';
              }
            } else {
              event.platform = 'streamlabs';
            }

            switch (data.type) {
              case 'follow': {
                outputmessage = event.name + ' has followed.';
                type = 'follow';
                this.eventHandler(outputmessage, type, event, 'labs');
                break;
              }
              case 'subscription': {
                let tier = '';
                if (event.sub_plan === '1000') {
                  tier = 'Tier 1';
                }
                if (event.sub_plan === '2000') {
                  tier = 'Tier 2';
                }
                if (event.sub_plan === '3000') {
                  tier = 'Tier 3';
                }
                if (event.sub_plan === 'prime') {
                  tier = 'Prime';
                }
                outputmessage = event.name + ' has subscribed (' + tier + ').';
                type = 'sub';
                this.eventHandler(outputmessage, type, event, 'labs');
                break;
              }
              case 'resub': {
                let tier = '';
                if (event.sub_plan === '1000') {
                  tier = 'Tier 1';
                }
                if (event.sub_plan === '2000') {
                  tier = 'Tier 2';
                }
                if (event.sub_plan === '3000') {
                  tier = 'Tier 3';
                }
                if (event.sub_plan === 'prime') {
                  tier = 'Prime';
                }
                if (event.streak_months) {
                  outputmessage =
                    event.name +
                    ' resubscribed (' +
                    tier +
                    ') for ' +
                    event.streak_months +
                    ' months in a row! (' +
                    event.months +
                    ' total).';
                } else {
                  outputmessage =
                    event.name +
                    ' resubscribed (' +
                    tier +
                    ') for ' +
                    event.months +
                    ' months!';
                }
                type = 'resub';
                this.eventHandler(outputmessage, type, event, 'labs');
                break;
              }
              case 'donation': {
                outputmessage =
                  event.from + ' donated ' + event.formatted_amount + '!';
                // console.log(event);
                if (event.message) {
                  outputmessage = outputmessage.concat(
                    ' Message: ' + event.message,
                  );
                }
                type = 'donation';

                this.eventHandler(outputmessage, type, event, 'labs');
                break;
              }
              case 'merch': {
                outputmessage = event.from + ' bought 1 ' + event.product + '!';
                if (event.message) {
                  outputmessage = outputmessage.concat(
                    ' Message: ' + event.message,
                  );
                }
                type = 'merch';
                this.eventHandler(outputmessage, type, event, 'labs');
                break;
              }

              case 'host': {
                if (event.viewers > 1) {
                  outputmessage =
                    event.name +
                    ' has hosted you with ' +
                    event.viewers +
                    ' viewers!';
                } else {
                  outputmessage =
                    event.name +
                    ' has hosted you with ' +
                    event.viewers +
                    ' viewer!';
                }
                type = 'host';
                this.eventHandler(outputmessage, type, event, 'labs');
                break;
              }

              case 'raid': {
                if (event.raiders > 1) {
                  outputmessage =
                    event.name +
                    ' has raided you with ' +
                    event.raiders +
                    ' raiders!';
                } else {
                  outputmessage =
                    event.name +
                    ' has raided you with ' +
                    event.raiders +
                    ' raider!';
                }
                type = 'raid';
                this.eventHandler(outputmessage, type, event, 'labs');
                break;
              }

              case 'bits': {
                outputmessage =
                  event.name + ' has used ' + event.amount + ' bits!';
                if (event.message) {
                  outputmessage = outputmessage.concat(
                    ' Message: ' + event.message,
                  );
                }
                type = 'cheer';
                this.eventHandler(outputmessage, type, event, 'labs');
                break;
              }

              // Youtube events:

              case 'superchat': {
                outputmessage =
                  event.name +
                  ' sent a ' +
                  event.displayString +
                  ' super chat!';
                // console.log(event);
                if (event.comment) {
                  outputmessage = outputmessage.concat(
                    ' Message: ' + event.comment,
                  );
                }
                type = 'superchat';

                this.eventHandler(outputmessage, type, event, 'labs');
                break;
              }
              default: {
                console.debug(data);
                break;
              }
            }
          });
        }
      } catch (error) {
        console.debug(error);
      }
    });
  }

  get events() {
    return this.store.peekAll('event');
  }

  eventsSorting = Object.freeze(['timestamp:desc']);
  @sort('events', 'eventsSorting') arrangedEvents;

  get lastevent() {
    if (this.arrangedEvents.length > 0) {
      return this.arrangedEvents.get('firstObject');
    }
    return [];
  }

  @action eventHandler(outputmessage, type, event, provider) {
    this.store
      .query('event', {
        filter: { externalId: event.id },
      })
      .then((exist) => {
        if (exist.length == 0) {
          // console.debug('Event: ', event);
          let nextEvent = this.store.createRecord('event');

          nextEvent.eventId = 'event';
          nextEvent.timestamp = new Date();
          nextEvent.parsedbody = this.parseMessage(
            outputmessage,
            [],
          ).toString();
          nextEvent.user = 'event';
          nextEvent.displayname = 'event';
          nextEvent.color = '#cccccc';
          nextEvent.csscolor = htmlSafe('color = #cccccc');
          nextEvent.badges = null;
          nextEvent.htmlbadges = '';
          if (type) {
            nextEvent.type = 'event-' + type.toString();
          } else {
            nextEvent.type = 'event';
          }
          nextEvent.usertype = null;
          nextEvent.reward = false;
          nextEvent.emotes = null;
          nextEvent.externalId = event.id;
          nextEvent.platform = event.platform;

          nextEvent.save();
          // If there is money involved we send an external song request
          if (type == 'donation') {
            if (event.amount > 0 && provider == 'labs') {
              let amount = event.formatted_amount.substring(1);
              let dspA = event.formatted_amount.replace(
                /(\.[0-9]*[1-9])0+$|\.0*$/,
                '$1',
              );
              let donodata = {
                id: event.id,
                user: event.name,
                fullname: event.from,
                amount: amount,
                formattedAmount: dspA,
                message: event.message,
                platform: event.platform,
              };

              this.queueHandler.externalToQueue(donodata);
            }
          }
          if (type == 'superchat') {
            if (event.amount > 0 && provider == 'labs') {
              let amount = event.displayString.substring(1);
              let dspA = event.displayString.replace(
                /(\.[0-9]*[1-9])0+$|\.0*$/,
                '$1',
              );
              let donodata = {
                id: event.id,
                user: event.name,
                fullname: event.name,
                amount: amount,
                formattedAmount: dspA,
                message: event.comment,
                platform: event.platform,
              };

              this.queueHandler.externalToQueue(donodata);
            }
          }
        }
      });
  }

  @action parseMessage(text, emotes) {
    var splitText = text.split('');
    for (var i in emotes) {
      var e = emotes[i];
      for (var j in e) {
        var mote = e[j];
        if (typeof mote == 'string') {
          mote = mote.split('-');
          mote = [parseInt(mote[0]), parseInt(mote[1])];
          var length = mote[1] - mote[0],
            empty = Array.apply(null, new Array(length + 1)).map(() => {
              return '';
            });
          splitText = splitText
            .slice(0, mote[0])
            .concat(empty)
            .concat(splitText.slice(mote[1] + 1, splitText.length));
          splitText.splice(
            mote[0],
            1,
            '<img class="twitch-emoticon" src="http://static-cdn.jtvnw.net/emoticons/v1/' +
              i +
              '/3.0">',
          );
        }
      }
    }
    return htmlSafe(splitText.join(''));
  }
}
