(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-array'), require('d3-path')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3-array', 'd3-path'], factory) :
  (factory((global.d3 = global.d3 || {}),global.d3,global.d3));
}(this, function (exports,d3Array,d3Path) { 'use strict';

  var cos = Math.cos;
  var sin = Math.sin;
  var pi = Math.PI;
  var halfPi = pi / 2;
  var tau = pi * 2;
  var max = Math.max;

  function compareValue(compare) {
    return function(a, b) {
      return compare(
        a.source.value + a.target.value,
        b.source.value + b.target.value
      );
    };
  }

  function multichord() {
    var padAngle = 0,
        sortGroups = null,
        sortSubgroups = null,
        sortChords = null;

    function multichord(matrix) {
      var n = matrix.length,
          nCategories = 2,
          groupSums = {},
          groupIndex = d3Array.range(n),
          subgroupIndex = [],
          chords = [],
          groups = chords.groups = new Array(n),
          subgroups = chords.subgroups = new Array(n * n),
          z,
          k,
          x,
          x0,
          dx,
          i,
          j;

      // Compute the sum.
      x = 0, z = 0, i = -1; while (++i < n) {
	  	if (!groupSums[i]){
          groupSums[i] = {}
        }
    	  	
	  	let input = 0, output = 0;
        j = -1; while (++j < n) {
        	let out = matrix[i][j],
        		inp = matrix[j][i];
        	
        	output += out;
        	if (i != j){
        		input += inp
        	}
        	
        }
        groupSums[i].out = output;
        groupSums[i].in = input;
        
        z += input + output;
        
        subgroupIndex.push(d3Array.range(n));
      }
      // Sort groups…
      
      if (sortGroups) groupIndex.sort(function(a, b) {
        return sortGroups(groupSums[a].in + groupSums[a].out, groupSums[b].in + groupSums[b].out);
      });

      // Sort subgroups…
      if (sortSubgroups) subgroupIndex.forEach(function(d, i) {
        d.sort(function(a, b) {
          return sortSubgroups(d3Array.sum(matrix[i][a]), d3Array.sum(matrix[i][b]));
        });
      });

      // Convert the sum to scaling factor for [0, 2pi].
      // TODO Allow start and end angle to be specified?
      // TODO Allow padding to be specified as percentage?
      z = max(0, tau - padAngle * n) / z;
      dx = z ? padAngle : tau / n;
      
      // Compute the start and end angle for each group and subgroup.
      // Note: Opera has a bug reordering object literal properties!
      x = 0, i = -1; while (++i < n) {
    	  const di = groupIndex[i];
    	  
    	  let a0 = x, 
    	  	v = matrix[di][di],
    	  	dj;
    	  
    	  // compute angles for internal flows
    	  subgroups[di * n + di] = [{
    		  index: di,
    		  subindex: di,
    		  startAngle: a0,
    		  endAngle: a0 + v * z,
    		  value: v
    	  }]
    	  a0 += v * z;
    	  
    	  // compute angles for departing flows
	      j = -1; while (++j < n) {
	    	  dj = subgroupIndex[di][j]
	    	  if (di == dj) continue;
	    	  
	    	  subgroups[dj * n + di] = new Array(2);
	    	  
	    	  v = matrix[di][dj];
	    	  
	    	  subgroups[dj * n + di][0] = {
	    		  index: di,
	    		  subindex: dj,
	    		  startAngle: a0,
	    		  endAngle: a0 + v * z,
	    		  value: v
	    	  }
	    	  a0 += v * z;  
	      }
	      
	      // compute angles for arriving flows 
	      j = -1; while(++j < n){
	    	  dj = subgroupIndex[di][j]
	    	  if (di == dj) continue;
	    	  
    		  v = matrix[dj][di];

    		  subgroups[dj * n + di][1] = {
    			  index: di,
    			  subindex: dj,
    			  startAngle: a0,
    			  endAngle: a0 + v * z,
    			  value: v
    		  }
    		  
    		  a0 += v * z;
	      }
	        
	      x0 = x;
	      x += (groupSums[di].in + groupSums[di].out) * z;
	      groups[di] = {
	    		  index: di,
	    		  startAngle: x0,
	    		  endAngle: x,
	    		  value: {in: groupSums[di].in,
			          out: groupSums[di].out}
	      };
	      x += dx;
      }
      // Generate chords for each (non-empty) subgroup-subgroup link.
      i = -1; while (++i < n) {
        j = i - 1; while (++j < n) {
        	k = -1; while (++k < 2){
        		
        		var targetIndex = i != j && k == 0 ? 1 : 0;
	        	let source = subgroups[j * n + i][k],
	                target = subgroups[i * n + j][targetIndex];

	        	if (matrix[target.index][source.index] == source.value){
	        		const temp = JSON.parse(JSON.stringify(source));
            		source = target;
            		target = temp;
	        	}
        		
	            if (source.value || target.value) {
	            	chords.push({source: source, target: target})
	            }
        		if (i == j) break;
        	}
    	  
        }
      }

      return sortChords ? chords.sort(sortChords) : chords;
    }

    multichord.padAngle = function(_) {
      return arguments.length ? (padAngle = max(0, _), multichord) : padAngle;
    };

    multichord.sortGroups = function(_) {
      return arguments.length ? (sortGroups = _, multichord) : sortGroups;
    };

    multichord.sortSubgroups = function(_) {
      return arguments.length ? (sortSubgroups = _, multichord) : sortSubgroups;
    };

    multichord.sortChords = function(_) {
      return arguments.length ? (_ == null ? sortChords = null : (sortChords = compareValue(_))._ = _, multichord) : sortChords && sortChords._;
    };

    return multichord;
  }

  var slice = Array.prototype.slice;

  function constant(x) {
    return function() {
      return x;
    };
  }

  function defaultSource(d) {
    return d.source;
  }

  function defaultTarget(d) {
    return d.target;
  }

  function defaultRadius(d) {
    return d.radius;
  }

  function defaultStartAngle(d) {
    return d.startAngle;
  }

  function defaultEndAngle(d) {
    return d.endAngle;
  }

  function ribbon() {
    var source = defaultSource,
        target = defaultTarget,
        radius = defaultRadius,
        startAngle = defaultStartAngle,
        endAngle = defaultEndAngle,
        context = null;

    function ribbon() {
      var buffer,
          argv = slice.call(arguments),
          s = source.apply(this, argv),
          t = target.apply(this, argv),
          sr = +radius.apply(this, (argv[0] = s, argv)),
          sa0 = startAngle.apply(this, argv) - halfPi,
          sa1 = endAngle.apply(this, argv) - halfPi,
          sx0 = sr * cos(sa0),
          sy0 = sr * sin(sa0),
          tr = +radius.apply(this, (argv[0] = t, argv)),
          ta0 = startAngle.apply(this, argv) - halfPi,
          ta1 = endAngle.apply(this, argv) - halfPi;

      if (!context) context = buffer = d3Path.path();

      context.moveTo(sx0, sy0);
      context.arc(0, 0, sr, sa0, sa1);
      if (sa0 !== ta0 || sa1 !== ta1) { // TODO sr !== tr?
        context.quadraticCurveTo(0, 0, tr * cos(ta0), tr * sin(ta0));
        context.arc(0, 0, tr, ta0, ta1);
      }
      context.quadraticCurveTo(0, 0, sx0, sy0);
      context.closePath();

      if (buffer) return context = null, buffer + "" || null;
    }

    ribbon.radius = function(_) {
      return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), ribbon) : radius;
    };

    ribbon.startAngle = function(_) {
      return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant(+_), ribbon) : startAngle;
    };

    ribbon.endAngle = function(_) {
      return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant(+_), ribbon) : endAngle;
    };

    ribbon.source = function(_) {
      return arguments.length ? (source = _, ribbon) : source;
    };

    ribbon.target = function(_) {
      return arguments.length ? (target = _, ribbon) : target;
    };

    ribbon.context = function(_) {
      return arguments.length ? ((context = _ == null ? null : _), ribbon) : context;
    };

    return ribbon;
  }

  exports.multichord = multichord;
  exports.ribbon = ribbon;

  Object.defineProperty(exports, '__esModule', { value: true });

}));