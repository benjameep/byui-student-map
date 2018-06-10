const zoom = d3.zoom()
  // .scaleExtent([1,9])
  .on('zoom',move)

const svg = d3.select("svg")
  .call(zoom)
const width = 960
const height = 500

const projection = d3.geoAlbersUsa()
  .scale(1020)
  .translate([width / 2, height / 2]);

const path = d3.geoPath()
  .projection(projection);

const g = svg.append('g')

const simulation = d3.forceSimulation()

const tooltip = d3.select("body").append("div").attr("class", "tooltip hidden");

const pt = svg.node().createSVGPoint();

function pairUp(arr){
  var out = [],s
  for(var i = 0; i < arr.length; i+=2){
    s = arr.slice(i,i+2)
    out.push({x:s[0],y:s[1]})
  }
  return out
}

function move(){
  g.attr('transform',d3.event.transform)
}

Promise.all([
  fetch('us.json').then(r => r.json()),
  fetch('cache.json').then(r => r.json()),
]).then(([us,cities]) => {

  g.append("g")
      .attr("id", "states")
    .selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)

  g.append("path")
    .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
    .attr("id", "state-borders")
    .attr("d", path);

  cities.forEach(city => city.people = pairUp(city.people))
  simulation
    .nodes(cities.reduce((arr,city) => arr.concat(city.people),[]))
    .stop()

  g.append('g').attr('id','cities')
    .attr('transform',`translate(${[width/2,height/2]}) scale(0.975) translate(${[-width/2,-height/2]})`)
    .selectAll('g')
    .data(cities).enter()
    .append('g')
    .each(function(city){
      var node = this
      d3.select(this).selectAll('circle')
      .data(city.people)
      .enter().append('circle')
      .attr('r',1)
      .attr('fill','#0076C6')
      .attr('fill-opacity',0.1)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .each(person => person.city = [node,city])
    })
    
    var last

    svg
      .on('mousemove',() => {
        pt.x = d3.event.x 
        pt.y = d3.event.y
        var transformed = pt.matrixTransform(document.getElementById('cities').getScreenCTM().inverse())
        var found = simulation.find(transformed.x,transformed.y,40)
        if(found){
          tooltip.classed('hidden',false)
            .attr('style',`left:${d3.event.x+20}px;top:${d3.event.y+10}px`)
            .html(() => `${found.city[1].location}<br/>${found.city[1].people.length} Student${found.city[1].people.length == 1 ? '':'s'}`)
          
          if(!last){
            last = found.city[0]
            last.classList.add('active')
          }
        } else {
          tooltip.classed('hidden',true)
          last && last.classList.remove('active')
          last = null
        }
      })
      .on('mouseout',d => {
        tooltip.classed('hidden',true)
        last && last.classList.remove('active')
        last = null
      })
  })