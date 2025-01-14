/*
    Constructing the svg
*/

// Note: TO DO: let user set target div

var ormjs;

ormjs.View = class {
    d3object;
    id;
    model;
    kind = "view";

    constructor(data) {

        if(!data.d3object) {
            // Create new d3 object
            this.model = data.model;
            this.id = ormjs.View.generateID(this.model);
            this.create_d3object(data);
        } 
        else {
            // Create new constraint object with provided d3 object
            var d = data.d3object.datum();
            this.id = data.d3object.attr("id");
            this.model = data.model ? data.model
                                    : d.model;
            d.id = this.id;
            this.d3object = data.d3object;
        }

        this.d3object.datum().model = this.model;
        
        // Record object
        this.record();
    }

    static generateID(model) {
        // Generate ID for a new constraint
        /*var svgID = "canvas-svg-" + orm.highestViewID.toString();
        orm.highestViewID += 1;*/
        return ormjs.Model.generateID(model,"view")
    }

    static default_scaling() {
        var param = {
            scale: ormjs.GraphUtils.get_css_number('--svg-scale'),
            scale_min: ormjs.GraphUtils.get_css_number('--svg-scale-min'),
            scale_max: ormjs.GraphUtils.get_css_number('--svg-scale-max')
        };
        param.inv_scale = param.scale_max + param.scale_min - param.scale;

        return param
    }

    static default_datum() {
        var d = ormjs.View.default_scaling();
        d.kind = "view";
        return d
    }

    create_d3object(data) {

        var def_d = ormjs.View.default_datum();
        var d = ormjs.Graph.fill_datum(data, def_d);
        
        //Create SVG element
        var newsvg = d3.select("#canvas")
            .append("svg")
                .datum( d )
                .attr("id", this.id)
                .attr("class", "svg_prototype")
                .attr("width", "100%")
                .attr("height", "100%")
                //.attr("preserveAspectRatio","none")
                .attr("viewBox", () => ormjs.View.set_viewbox(d.scale))
                .attr("scaleValue", d.inv_scale)
                .attr("shape-rendering", "geometricPrecision");

        this.d3object = newsvg;
        // Add svg actions
        this.actions();
        
    }

    record() {
        // Add new svg to global record
        //orm.views[this.id] = this;
        ormjs.models[this.model].objects[this.kind][this.id] = this;
    }

    static set_viewbox(svgscale) {
        /* Rescale SVG using viewBox attribute.
           Set the string for the rescale. */
        return "-" + svgscale/2 + ", -" + svgscale/2 +
               ", " + svgscale + ", " + svgscale;
    }

    static set_svgscale(svgobj) {
        /* Set the viewBox attribute based on value of #svgscale attribute. */
        var d = svgobj.d3object.datum();
        d.scale = ormjs.GraphUtils.parse_number( d3.select("#svgscale").property("value") );
        d.scale_min = ormjs.GraphUtils.parse_number( d3.select("#svgscale").property("min") );
        d.scale_max = ormjs.GraphUtils.parse_number( d3.select("#svgscale").property("max") );

        // Invert the scale so slider is more intuitive (slide right to zoom in)
        d.inv_scale = d.scale_max + d.scale_min - d.scale;
        
        // Set viewBox
        svgobj.d3object
            .attr("viewBox", () => ormjs.View.set_viewbox(d.inv_scale))
            .attr("scaleValue", d.inv_scale);
    }

    link_svgscale() {
        // Set slider for svg size
        var d = this.d3object.datum();
        d3.select("#svgscale")
            .property("min", d.scale_min)
            .property("max", d.scale_max)
            .property("value", d.scale)
            .on("change", () => { ormjs.View.set_svgscale(this) });
    }

    set_current() {
        //svg = d3.select(`#${this.id}`);
        ormjs.models[this.model].set_current_view(this.id);
        this.link_svgscale();
    }

    actions() {

        /*
            Click events on the SVG.
         */

        var svgMenu = ormjs.OptionMenu.svg_menu(this.model);
    
        this.d3object
            .on("contextmenu", d3.contextMenu(svgMenu))
            .on("mousedown", ormjs.HighlightRegion.svg_mousedown)
            .on("click", (event) => { d3.select("#hrect").remove(); })
            .on("dblclick", (event) => {
                event.stopPropagation();
                // Just in case
                d3.select("#hrect").remove();
                ormjs.HighlightRegion.unselect_all(this.id);
                // Get mouse position
                var mouse = d3.pointer(event);
                if (event.shiftKey && event.ctrlKey) {
                    // Create value on ctrl+shift+doubleclick
                    new ormjs.Value({x: mouse[0], y: mouse[1], model:this.model})
                } else if (event.shiftKey) {
                    // Create rolebox on shift+doubleclick
                    new ormjs.Predicate({x: mouse[0], y: mouse[1], model:this.model})
                } else {
                    // Create entity on doubleclick
                    new ormjs.Entity({x: mouse[0], y: mouse[1], model:this.model})
                }
            });
        
        // Popup actions
        d3.select("body")
            .on("keypress", (event) => {
                if(event.keyCode === 13 && ormjs.propmenu.open_popups.length > 0) {
                    ormjs.PropertyMenu.enter_last_popup();
                }
            })
    }

    objects_in_view() {
        var object_classes = ["entity_prototype", "value_prototype", 
            "rolebox_group", "constraint_prototype"];
        var objIDs = object_classes.map( (cls) => {
            var object_divs = d3.select(`#${this.id}`).selectAll("."+cls).nodes();
            return object_divs.map( (obj) => { return obj.id} );
        }).flat().filter(v=>v);
        return objIDs
    }

}