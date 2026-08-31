import vns from './vns.json';

/**
 * Derived type label for a model: an explicit `model_type`, else the response
 * variable's component + measure (e.g. "Stem height"). Used by both the Models
 * page (type label + filter) and the Publications page ("Model Type" grouping).
 */
export function typeLabel(m: {
	model_type: string;
	response: [string, string][];
}): string {
	if (m.model_type) return m.model_type.charAt(0).toUpperCase() + m.model_type.slice(1);
	const v = vns.variables[m.response[0]?.[0]];
	if (v?.component && v?.measure) {
		return v.component.charAt(0).toUpperCase() + v.component.slice(1) + ' ' + v.measure;
	}
	return '—';
}
