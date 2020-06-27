const fs = require('fs');
const yaml = require('js-yaml');

function defined(obj){
    return (typeof(obj) != "undefined")
}

const mano_config = yaml.safeLoad(fs.readFileSync(__dirname+'/configuration-mano.yaml', 'utf8'));
const lifo_config = yaml.safeLoad(fs.readFileSync(__dirname+'/configuration-lifo.yaml', 'utf8'));

const location = JSON.parse(fs.readFileSync(__dirname+'/devices_location.json'))

function add_vertex(graph,vertex){
    vertex.id = graph.vertices.length//next
    graph.vertices.push(vertex)
}

function graph_get_vertex_id(graph,v_name){
    for(let vertex of graph.vertices){
        if(vertex.name == v_name){
            return vertex.id
        }
    }
    return -1
}

function add_edge(graph,v1_id,v2_id,edge_label){
    const next_e_id = graph.edges.length//next
    const edge = {
        id:next_e_id,
        outV:v1_id,
        inV:v2_id,
        label:edge_label
    }
    graph.edges.push(edge)
}

function add_zigbee_config(graph,config,hostname){
    //-------------- add zigbee devices --------------
    for(let [key,device] of Object.entries(config.devices)){
        const name = device.friendly_name
        let vertex = {
            name:name,
            mac:key,
            zigbee_coordinator:config.mqtt.base_topic
        }
        if(defined(location[name])){
            if(location[name].room)
            vertex.room = location[name].room
        }
        add_vertex(graph,vertex)
    }
    //-------------- add zigbee coordinator --------------
    let vertex = {
        name:config.mqtt.base_topic,
        hostname:hostname,
        zigbee_channel:config.advanced.channel
    }
    add_vertex(graph,vertex)
}

function graph_property_to_groups(graph,property){
    graph.vertices.forEach(vertex => {
        if(defined(vertex[property])){
            let group_v_id = graph_get_vertex_id(graph,vertex[property])
            if(group_v_id == -1){
                add_vertex(graph,{
                    "name":vertex[property]
                })
                group_v_id = graph.vertices.length-1//last
            }
            add_edge(graph,group_v_id,vertex.id,"group")
        }
    });
}

let graph = {vertices:[],edges:[]}

add_zigbee_config(graph,mano_config,"mano")
add_zigbee_config(graph,lifo_config,"lifo")

graph_property_to_groups(graph,"room")
graph_property_to_groups(graph,"zigbee_coordinator")

fs.writeFileSync(__dirname+'/smart_home.json', JSON.stringify(graph,null,2));

