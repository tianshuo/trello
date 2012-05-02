// init
var App = {
    model: {},
    collection: {},
    view: {},
};

/**
 * Current User model
 */
App.model.CurrentUser = Backbone.Model.extend({
    sync: function(method, model, options) {
        if (method == 'read') {
            return Trello.get('/members/me', {}, options.success, options.error);
        } else {
            throw "not (yet) supported";
        }
    }
});

/**
 * Card model
 */
App.model.Card = Backbone.Model.extend({

    sync: function(method, model, options) {
        if (method == 'read') {
            // only support update due date
            return Trello.put('/cards/'+ model.id, {}, options.success, options.error);
        } else {
            throw "not (yet) supported";
        }
    }
});

/**
 * Cards collection
 */
App.collection.Cards = Backbone.Collection.extend({
    model: App.model.Card,

    initialize: function(models, options) {
        this.options = options;
    },

    sync: function(method, model, options) {
        if (method == 'read') {
            return Trello.get('/boards/'+ this.options.board.id +'/cards', {badges: true}
				, options.success, options.error);
        } else {
            throw "not (yet) supported";
        }
    }
});

/**
 * List model
 */
App.model.List = Backbone.Model.extend({

    sync: function(method, model, options) {
        if (method == 'read') {
            // only support update due date
            return Trello.put('/lists/'+ model.id, {}, options.success, options.error);
        } else {
            throw "not (yet) supported";
        }
    }
});

/**
 * Lists collection
 */
App.collection.Lists = Backbone.Collection.extend({
    model: App.model.List,

    initialize: function(models, options) {
        this.options = options;
    },

    sync: function(method, model, options) {
        if (method == 'read') {
            return Trello.get('/boards/'+ this.options.board.id +'/lists', {badges: true}
				, options.success, options.error);
        } else {
            throw "not (yet) supported";
        }
    }
});

/**
 * Board model
 */
App.model.Board = Backbone.Model.extend({
    defaults: {
        hidden: false
    },

    initialize: function() {
        this._cards = new App.collection.Cards([], {board: this});
		// this.hidden = true; 
    },

    cards: function() {
        return this._cards;
    },

    _getValue: function(defaultValue) {
        return defaultValue;
    }
});

/**
 * Board collection
 */
App.collection.Boards = Backbone.Collection.extend({
    model: App.model.Board,
	/*comparator: function(mode) {
		return model.get('*/
    sync: function(method, model, options) {
        if (method == 'read') {
            return Trello.get('/members/my/boards', {filter: 'open'}, options.success, options.error); //TODO: Change to support organization
        } else {
            throw "not (yet) supported";
        }
    }
});

/**
 * Render a card
 */
App.view.Card = Backbone.View.extend({
    initialize: function() {
        this.model.on('change', this.render, this);
    },

    render: function() {
        if (this.model.get('hidden')) {
            //this.$el.fullCalendar('removeEvents', this.model.id);
			console.log("hide:"+this.model.get('name'));
        } else {
            //this.$el.fullCalendar('removeEvents', this.model.id);
            /*this.$el.fullCalendar('renderEvent', {
                backboneModel: this.model,
                id: this.model.id,
                allDay: false,
                title: this.model.get('name'),
                start: this.model.get('badges').due,
                color: this.model.boardColor(),
                url: this.model.get('url')
            }, true);*/
			console.log("show:"+this.model.get('name'));
        }
        return this;
    },

    remove: function() {
        console.log("hide:"+this.model.get('name'));
		//this.$el.fullCalendar('removeEvents', this.model.id);
    }
});

/**
 * Render cards of one board
 */
App.view.CardsBoard = Backbone.View.extend({
    initialize: function() {
        this.views = [];
        this.model.cards().on('reset', this.render, this);
    },

    render: function() {
        // remove previously events
        _(this.views).each(function(view) {
            view.remove();
        });
        this.views = this.model.cards().chain().map(_.bind(function(card) {
            // no arm, no chocolate
            // if (!card.get('badges').due) return;
            return new App.view.Card({model: card,
                                      el: this.el}).render();
        }, this)).filter(function(view) {
            return view;
        }).value();
        return this;
    }
});


/**
 * Render all cards from all boards
 */
App.view.Cards = Backbone.View.extend({
    initialize: function() {
        this.collection.on('reset', this.render, this);
    },

    render: function() {
        this.collection.each(_.bind(function(board) {
            new App.view.CardsBoard({model: board,
                                     el: this.el}).render();
        }, this));
        return this;
    }
});



/**
 * Render a board filter
 */
App.view.Board = Backbone.View.extend({
	/*initialize: function() {
		this.model.set({hidden: true});
	},*/
	events: {
        "click input": "click"
    },

    tagName: 'label',

    click: function(e) {
        var hidden = !$(e.target).is(':checked');
        this.model.set({hidden: hidden});
        this.$el.toggleClass('checked');  //TODO: Change this
    },

    render: function() {
        var input = this.make('input', {type: 'checkbox',
                                        value: this.model.id,
                                        checked: !this.model.get('hidden')});
        this.$el.css({'background-color': 'green'}) //changed
                .attr('title', 'Show cards from the board '+  this.model.get('name'))
                .text(this.model.get('name'))
                .append(input);
        if (!this.model.get('hidden') === true)
            this.$el.addClass('checked');
        return this;
    }
});


/**
 * List of boards filters
 */
App.view.Boards = Backbone.View.extend({
    initialize: function() {
        this.collection.on('reset', this.render, this);
    },

    render: function() {
        this.collection.each(_.bind(function(board) {
            var view = new App.view.Board({model: board}).render();
            $(view.el).appendTo(this.el);
        }, this));
    }
});

/**
 * Main view
 */
App.view.Doc = Backbone.View.extend({
    events: {
        'click .quit': 'quit'
    },

    initialize: function() {
        this.boards = new App.collection.Boards();
        this.currentUser = this.options.currentUser;

        this.boards.on('reset', this._getCards, this);
        this.boards.on('change:hidden', this._updateBoardVisibility, this);
        this.boards.fetch();
    },

    render: function() {
        this._createDocument();
        new App.view.Boards({collection: this.boards,
                             el: this.$('#boards').get(0)}).render();
        new App.view.Cards({collection: this.boards,
                            el: this.$('#documents').get(0)}).render();
        
        $(this.make('a', {'class': 'quit',
                          href: '#'}, 'µÇ³ö')).appendTo(this.el);
        return this;
    },

    quit: function(e) {
        e.preventDefault();
        Trello.deauthorize();
        location.reload();
    },

    _updateBoardsVisibility: function() {
        this.boards.each(_.bind(function(board) {
            this._updateBoardVisibility(board);
        }, this));
    },

    _updateBoardVisibility: function(board) {
        board.cards().each(_.bind(function(card) {
            var hidden = board.get('hidden');
            card.set({hidden: hidden});
        }, this));
    },

    _getCards: function() {
        this.boards.each(_.bind(function(board) {
            board.cards().on('reset', _.bind(this._updateBoardVisibility, this, board));
            board.cards().fetch(); //{not_archived: this.prefs.get('not_archived')});
        }, this));
    },

    _createDocument: function() {
        var calendar = this.$('#calendar').fullCalendar({
            header: {
	        left: 'prev,next today',
	        center: 'title',
	        right: 'month,agendaWeek,agendaDay'
	    },
            height: $(document).height() - 50,
            editable: true,
            disableResizing: true,
            ignoreTimezone: false,
            timeFormat: "H'h'(mm)",
            eventAfterRender: function(event, element, view) {
                $(element).attr('title', event.backboneModel.get('desc'));
            },
            eventDrop: function(event, dayDelta, minuteDelta, allDay, revertFunc) {
                var card = event.backboneModel;
                var date = moment(event.start).format("YYYY-MM-DDTHH:mm:ssZ");
                var badges = _.extend({}, card.get('badges'), {due: date});
                card.set({badges: badges});
                card.save();
            }
        });
    }
});

$(document).ready(function() {
    var defaultOptions = {
        scope: {
            write: false
        },
        success: onAuthorize
    };
    /**
     * Authentication dance
     *  1. try to get a token from a previous session
     *  2. if no authorized token found, ask a token
     *  3. try to fetch the current user, in case of a revoked/expired token
     *  4. start application
     */
    Trello.authorize(_.extend({}, defaultOptions, {
        interactive: false
    }));

    if (!Trello.authorized()) {
        return Trello.authorize(defaultOptions);
    }

    function onAuthorize() {
        if (!Trello.authorized()) return Trello.authorize(defaultOptions);
        var currentUser = new App.model.CurrentUser();
        currentUser.fetch().done(function() {
            GlobalDoc=new App.view.Doc({el: $('body').get(0), currentUser: currentUser}).render();
        }).fail(function(xhr) {
            if (xhr.status == 401) {
                Trello.deauthorize();
                Trello.authorize(defaultOptions);
            } else {
                $('<p>').text('Trello error: try to reload the page').appendTo($('body'));
            }
        });
    }
});
