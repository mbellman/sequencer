/**
 * "Unit" easing functions
 *
 * Inputs should be between 0 and 1. Any
 * additional scaling/mapping should be
 * done with the returned value.
 */
var Ease = {
	quad : {
		out   : function(t) {
			return t * (2-t);
		},

		in    : function(t) {
			t -= 1;
			return 1 + t * (2+t);
		},

		inOut : function(t) {
			t *= 2;
			t -= 1;

			if(t < 0)
				return  (1 + t * (2+t)) / 2;
			else
				return  (1 + t * (2-t)) / 2;
		}
	}
}