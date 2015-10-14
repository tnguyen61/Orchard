"use strict"

var SupportCounterViewModel = function () {
    var self = this;

    self.target = $('#ticket-counter').attr('target');

    self.newMessages = ko.observable('?');

    self.update = function () {
        $.ajax({
            url: self.target,
            jsonp: 'callback',
            dataType: 'jsonp',
            success: function (results) {
                self.newMessages(results.unread);
            }
        });
    };

    setTimeout(self.update(), 30000);
    self.update();
};

$(document).ready(function () {
    var area = $('#ticket-counter')[0];
    if (area) {
        ko.applyBindings(new SupportCounterViewModel(), area);
    }
});