/* 
Copyright (C) 2014 Robert DeSantis
hopluvr at gmail dot com

This file is part of DMX Studio.
 
DMX Studio is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 3 of the License, or (at your
option) any later version.
 
DMX Studio is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public
License for more details.
 
You should have received a copy of the GNU General Public License
along with DMX Studio; see the file _COPYING.txt.  If not, write to
the Free Software Foundation, Inc., 59 Temple Place - Suite 330, Boston,
MA 02111-1307, USA.
*/

(function($, undefined){
    $.widget("ui.track_visualize_control", {

        pluginName: "track_visualize_control",

        BAR_BORDER_SIZE: 1,
        BAR_BOX_WIDTH: 2,
        EDGE_BORDER: 2,

        options: {
            onchange: null,
            amplitude_data: [ 0 ],
            height: 200,
            min_width: 2000,
            bar_border_color: "rgb( 0, 0, 255 )",
            bar_unselected_fill: "rgb( 0, 0, 150 )",
            bar_highlight_fill: "rgb( 0, 111, 128)",
            bar_selected_fill: "white",
            bar_hover_fill: "rgb( 81, 81, 194 )",
            background_color: "transparent",
            canvas_style: "overflow-x: auto;",
            annotation_color: "white",
            text_color: "white",
            onclick: null,
            play_callback: null,
            zoom_percent: .75
        },

        // Widget constructor (access with this.element)
        _create: function () {
            var canvas_tag = '<canvas id="track_visualize_canvas" style="' + this.options.canvas_style + '"></canvas>';
            this.canvas = $(canvas_tag);

            this.canvas.attr({ height: this.options.height, width: this.options.min_width });
            this.canvas.height(this.options.height);

            this.container = $( '<div style="overflow-x: auto; overflow-y: hidden; background-color:transparent; width:100%; height:100%"></div>' );
            this.canvas.appendTo(this.container);
            this.container.appendTo(this.element);

            var self = this;
            this.canvas.on("mousedown", function (event) { self._on_mouse_down(event); });
            this.canvas.on("mousemove", function (event) { self._on_mouse_move(event); });
            this.canvas.on("mouseout", function (event) { self._on_mouse_out(event); });
        },

        _init: function () {
            this.load(this.options.amplitude_data);
        },

        load: function (amplitude_data) {
            if (amplitude_data == null)
                return;

            this.options.amplitude_data = amplitude_data;

            this.container.scrollLeft(0);

            this.canvasWidth = Math.max( amplitude_data.length * (this.BAR_BOX_WIDTH + this.BAR_BORDER_SIZE) + (this.EDGE_BORDER * 2), this.options.min_width );

            this.bars = [];
            this.max_bar_height = 0;

            var x = this.EDGE_BORDER;

            for (var i = 0; i < this.options.amplitude_data.length; i++) {
                var bar_height = ((this.options.amplitude_data[i] / 32767.0) * 100) * this.options.zoom_percent;
                var y = this.options.height - bar_height - this.BAR_BORDER_SIZE;

                this.bars[this.bars.length] = {
                    "number" : i,
                    "x": x, "y": y, "height": bar_height,
                    "highlight": false, "selected": false, hover: false, "annotation": null
                };

                x += (this.BAR_BOX_WIDTH + this.BAR_BORDER_SIZE);         // Borders overlap - hence 1 border

                if (bar_height > this.max_bar_height+4)
                    this.max_bar_height = bar_height+4;
            }

            this.draw();
        },

        draw: function () {
            this.canvas.attr({ width: this.canvasWidth });
            this.canvas.width(this.options.canvasWidth);

            var ctx = this.canvas.get(0).getContext("2d");

            ctx.beginPath();
            ctx.fillStyle = this.options.background_color;
            ctx.lineWidth = 0;
            ctx.rect(0, 0, this.canvasWidth, this.options.height);
            ctx.fill();
            ctx.closePath();

            for (var y = 0; y < 2; y++ )
                for (var i = 0; i < this.bars.length; i++)
                    this._paint_bar(ctx, this.bars[i], true);
        },

        play: function (start_bar, interval_ms) {
            this.stop();

            this.highlightLeft( this.bars.length, false );
            if ( start_bar > 0 )
                this.highlightLeft( start_bar-1, true );

            this._timer( start_bar, interval_ms );
         },

        _timer: function( index, interval_ms ) {
            this.highlight( [ index ], true );

            var bar = this.bars[index];

            if (this.play_callback != null && bar.annotation != null)
                this.play_callback(bar);

            if (this.canvas.width() > this.container.width() &&
                bar.x >= this.container.width() + this.container.scrollLeft() - (this.BAR_BOX_WIDTH + this.BAR_BORDER_SIZE) ) {
                this.container.scrollLeft( bar.x - this.container.width()/2 ) ; 
            }

            if ( ++index < this.bars.length ) {
                var self = this;
                this.auto_timer = setTimeout( function() {
                    self._timer( index, interval_ms );
                }, interval_ms );
            }
        },

        stop: function ( ) {
            if ( this.auto_timer != null ) {
                clearTimeout( this.auto_timer );
                this.auto_timer = null;
            }
        },

        highlight: function( bar_list, highlight ) {
            if ( bar_list == null )
                return;

            var ctx = this.canvas.get(0).getContext("2d");

            for ( var index=0; index < bar_list.length; index++ ) {
                var bar_number = bar_list[index];
                if (bar_number < 0 || bar_number >= this.bars.length)
                    continue;

                var bar = this.bars[bar_number];
                if (bar.highlight == highlight)
                    continue;

                bar.highlight = highlight;
                this._paint_bar(ctx, bar, false);
            }
        },

        highlightLeft: function (num_bars, highlight) {
            var ctx = this.canvas.get(0).getContext("2d");

            for (var index = 0; index < num_bars && index < this.bars.length; index++) {
                var bar = this.bars[index];
                if (bar.highlight == highlight)
                    continue;

                bar.highlight = highlight;
                this._paint_bar(ctx, bar, false);
            }
        },

        annotate: function (bar_number, label, data ) {
            if (bar_number < 0 || bar_number >= this.bars.length)
                return;

            var ctx = this.canvas.get(0).getContext("2d");

            var bar = this.bars[bar_number];
            bar.annotation = { "label": label, "data": data };
            this.draw();
        },

        _paint_bar: function( ctx, bar, drawAnnotation ) {
            ctx.beginPath();
            ctx.lineWidth = this.BAR_BORDER_SIZE;
            ctx.strokeStyle = this.options.bar_border_color;
            ctx.rect(bar.x, bar.y, this.BAR_BOX_WIDTH, bar.height);
            ctx.stroke();

            if (bar.selected)
                ctx.fillStyle = this.options.bar_selected_fill;
            else if ( bar.hover)
                ctx.fillStyle = this.options.bar_hover_fill;
            else if (bar.highlight)
                ctx.fillStyle = this.options.bar_highlight_fill;
            else
                ctx.fillStyle = this.options.bar_unselected_fill;

            ctx.fill();

            if (drawAnnotation && bar.annotation != null && bar.annotation.label != null) {
                ctx.save();
                ctx.translate(0, 0);
                ctx.rotate( 270 * Math.PI / 180);
                ctx.font = '7pt Arial';
                ctx.textAlign = 'left';
                ctx.fillStyle = this.options.text_color;
                ctx.fillText(bar.annotation.label, -(this.options.height - this.max_bar_height - 4), bar.x - 2);
                ctx.restore();

                var text_width = ctx.measureText(bar.annotation.label).width;

                ctx.lineWidth = .5;
                ctx.strokeStyle = this.options.annotation_color;
                ctx.beginPath();
                ctx.moveTo(bar.x + .5, bar.y);
                ctx.lineTo(bar.x + .5, (this.options.height-this.max_bar_height) - text_width );
                ctx.stroke();
            }
        },

        unselect_all: function () {
            var ctx = this.canvas.get(0).getContext("2d");

            for (var i = 0; i < this.bars.length; i++) {
                if (this.bars[i].selected) {
                    this.bars[i].selected = false;
                    this._paint_bar(ctx, this.bars[i], false)
                }
            }
        },

        _cancel_event : function( event ) {
            if (event = (event || window.event)) {
                if (event.stopPropagation != null)
                    event.stopPropagation();
                else
                    event.cancelBubble = true;
            }
        },

        _get_bar: function( event ) {
            var canvas_x = event.clientX - Math.round(this.canvas.offset().left);
            var canvas_y = event.clientY - Math.round(this.canvas.offset().top);

            var bar_number = Math.floor( (canvas_x - this.EDGE_BORDER) / (this.BAR_BOX_WIDTH + this.BAR_BORDER_SIZE) );

            if (bar_number < 0 || bar_number >= this.bars.length)
                return null;

            var bar = this.bars[bar_number];

            if (canvas_y < this.options.height - this.max_bar_height - this.BAR_BORDER_SIZE)
                return null;
            
            return bar;
        },

        _on_mouse_down: function (event) {
            this._cancel_event(event);

            var bar = this._get_bar(event);
            if (bar == null) {
                this.unselect_all();
                return;
            }

            var selected = !bar.selected;

            this.unselect_all();

            if (selected) {
                var ctx = this.canvas.get(0).getContext("2d");
                bar.selected = true;
                this._paint_bar(ctx, bar, false);
            }

            if (this.options.onclick != null)
                this.options.onclick( event, bar );
        },

        _on_mouse_move: function (event) {
            this._cancel_event(event);

            var bar = this._get_bar(event);
            if (bar == null) {
                this._on_mouse_out(null);
                return;
            }

            var ctx = this.canvas.get(0).getContext("2d");

            for (var i = 0; i < this.bars.length; i++) {
                var hover = i <= bar.number;

                if (this.bars[i].hover != hover) {
                    this.bars[i].hover = hover;
                    this._paint_bar(ctx, this.bars[i], false);
                }
            }
        },

        _on_mouse_out: function( event ) {
            this._cancel_event(event);

            var ctx = this.canvas.get(0).getContext("2d");

            for (var i = 0; i < this.bars.length; i++) {
                if (this.bars[i].hover) {
                    this.bars[i].hover = false;
                    this._paint_bar(ctx, this.bars[i], false)
                }
            }
        },

        _setOption: function (key, value) {
            this.options[key] = value;
            $.Widget.prototype._setOption.apply(this, arguments);
            this._draw();
        }
    });

})(jQuery);