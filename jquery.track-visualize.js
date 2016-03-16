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
        BAR_BOX_WIDTH: 3,
        EDGE_BORDER: 2,

        options: {
            onchange: null,
            amplitude_data: [ 0 ],
            height: 200,
            min_width: 800,
            bar_border_color: "black",
            bar_unselected_fill: "cyan",
            bar_highlight_fill: "blue",
            bar_selected_fill: "black",
            background_color: "green",      // "#FFFFFF",
            canvas_style: "overflow-x: auto;",
            annotation_color: "white",
            text_color: "white",
            onclick: null
        },

        // Widget constructor (access with this.element)
        _create: function () {
            var canvas_tag = '<canvas id="track_visualize_canvas" style="' + this.options.canvas_style + '"></canvas>';

            this.canvas = $(canvas_tag);

            this.canvas.attr({ height: this.options.height });

            this.canvas.height(this.options.height );

            this.canvas.appendTo(this.element);

            var self = this;
            this.canvas.on("mousedown", function (event) { self._on_mouse_down(event); });
            this.canvas.on("mouseover", function (event) { self._on_mouse_over(event); });
        },

        _init: function () {
            this.load(this.options.amplitude_data);
        },

        load: function ( amplitude_data ) {
            if (amplitude_data == null)
                return;

            this.options.amplitude_data = amplitude_data;

            this.canvasWidth = Math.max( amplitude_data.length * (this.BAR_BOX_WIDTH + this.BAR_BORDER_SIZE) + (this.EDGE_BORDER * 2), this.options.min_width );

            this.bars = [];

            var x = this.EDGE_BORDER;

            for (var i = 0; i < this.options.amplitude_data.length; i++) {
                var bar_height = (this.options.amplitude_data[i] / 32767.0) * 100;
                var y = this.options.height - bar_height - this.BAR_BORDER_SIZE;

                this.bars[this.bars.length] = { "x": x, "y": y, "height": bar_height, "highlight": false, "selected": false, "annotation": null };

                x += (this.BAR_BOX_WIDTH + this.BAR_BORDER_SIZE);         // Borders overlap - hence 1 border
            }

            this.draw();
        },

        draw: function () {
            this.canvas.attr({ width: this.canvasWidth });
            this.canvas.width(this.options.canvasWidth);

            var ctx = this.canvas.get(0).getContext("2d");

            // ctx.scale(1, 1);

            ctx.beginPath();
            ctx.fillStyle = this.options.background_color;
            ctx.lineWidth = 0;
            ctx.rect(0, 0, this.canvasWidth, this.options.height);
            ctx.fill();
            ctx.closePath();

            for (var i = 0; i < this.bars.length; i++)
                this._paint_bar(ctx, this.bars[i], true);
        },

        begin: function ( start_bar, interval_ms ) {
            this.highlightLeft( this.bars.length, false );
            if ( start_bar > 0 )
                this.highlightLeft( start_bar-1, true );

            this._timer( start_bar, interval_ms );
         },

        _timer: function( index, interval_ms ) {
            this.highlight( [ index ], true );

            if ( this.bars[index].annotation != null && this.bars[index].annotation.callback != null )
                this.bars[index].annotation.callback( index );

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

        annotate: function (bar_number, annotation, callback) {
            if (bar_number < 0 || bar_number >= this.bars.length)
                return;

            var ctx = this.canvas.get(0).getContext("2d");

            var bar = this.bars[bar_number];
            bar.annotation = { "annotation": annotation, "callback": callback };
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
            else if (bar.highlight)
                ctx.fillStyle = this.options.bar_highlight_fill;
            else
                ctx.fillStyle = this.options.bar_unselected_fill;

            ctx.fill();

            if (drawAnnotation && bar.annotation != null) {
                ctx.lineWidth = .5;
                ctx.strokeStyle = this.options.annotation_color;

                var y = this.options.height - 120;

                ctx.beginPath();
                ctx.moveTo(bar.x + 1, bar.y);
                ctx.lineTo(bar.x + 1, y);
                ctx.lineTo(bar.x + 8, y);
                ctx.stroke();

                ctx.font = '8pt Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = this.options.text_color;
                ctx.fillText(bar.annotation.annotation, bar.x + 20, y + 4);

                // ctx.measureText(bar.annotation).width

            }
        },

        _on_mouse_down: function ( event ) {
            if (event = (event || window.event)) {
                if (event.stopPropagation != null)
                    event.stopPropagation();
                else
                    event.cancelBubble = true;
            }

            var canvas_x = event.clientX - Math.round(this.canvas.offset().left);
            var canvas_y = event.clientY - Math.round(this.canvas.offset().top);

            var bar_number = Math.floor( (canvas_x - this.EDGE_BORDER) / (this.BAR_BOX_WIDTH + this.BAR_BORDER_SIZE) );

            if (bar_number < 0 || bar_number >= this.bars.length)
                return;

            var bar = this.bars[bar_number];

            if (canvas_y < this.options.height - bar.height - this.BAR_BORDER_SIZE)
                return;

            if ( !bar.selected ) {
                var ctx = this.canvas.get(0).getContext("2d");

                for (var i = 0; i < this.bars.length; i++)
                    if (this.bars[i].selected) {
                        this.bars[i].selected = false;
                        this._paint_bar(ctx, this.bars[i],false)
                        break;
                    }

                bar.selected = true;

                this._paint_bar(ctx, bar, false);
            }

            if (this.options.onclick != null)
                this.options.onclick( event, bar_number );
        },

        _on_mouse_over: function (event) {
            if (event = (event || window.event)) {
                if (event.stopPropagation != null)
                    event.stopPropagation();
                else
                    event.cancelBubble = true;
            }

            /*
            this.canvas.off("mouseup");
            this.canvas.off("mousemove");

            this.canvas.get(0).releaseCapture();

            if (this.options.onchange && this.options.on_release_only)
                this.options.onchange(this.get_location());
            */

            return false;
        },

        _setOption: function (key, value) {
            this.options[key] = value;
            $.Widget.prototype._setOption.apply(this, arguments);
            this._draw();
        }
    });

})(jQuery);