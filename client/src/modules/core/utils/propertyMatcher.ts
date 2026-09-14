import { Inquiry, Property, PropertyMatchResult } from '@/modules/core/types';

export function matchPropertiesForInquiry(
  inquiry?: Inquiry,
  properties: Property[] = []
): PropertyMatchResult[] {
  if (!inquiry || !properties || properties.length === 0) return [];

  const results: PropertyMatchResult[] = [];

  const inqLocation = (inquiry.location || '').trim();
  const inqCorridor = (inquiry.targetCorridor || '').trim();
  const inqIndustry = (inquiry.industry || '').trim().toLowerCase();
  const inqArea = Number(inquiry.requiredAreaSqFt) || 0;
  const inqDocks = Number(inquiry.dockRequirements) || 0;

  for (const prop of properties) {
    if (prop.status === 'Fully Leased') continue;

    let score = 0;
    const details: string[] = [];

    // 1. Location / Corridor Match (Weight: 30%)
    const reqLoc = (inqLocation + ' ' + inqCorridor).toLowerCase();
    const propLoc = ((prop.location || '') + ' ' + (prop.corridor || '') + ' ' + (prop.city || '')).toLowerCase();
    const locationMatch = Boolean(
      (prop.city && reqLoc.includes(prop.city.toLowerCase())) ||
      (inqLocation && propLoc.includes(inqLocation.toLowerCase())) ||
      (inqCorridor && prop.corridor && prop.corridor.toLowerCase().includes(inqCorridor.toLowerCase()))
    );

    if (locationMatch) {
      score += 30;
      details.push(`✓ Location Match: Situated in ${prop.city || 'Gujarat'} (${prop.corridor || 'Industrial Park'})`);
    } else {
      details.push(`✕ Location: Located in ${prop.city || 'Gujarat'}, outside primary target`);
    }

    // 2. Area Compatibility (Weight: 30%)
    const propAvailArea = Number(prop.availableAreaSqFt) || 0;
    const areaRatio = inqArea > 0 ? propAvailArea / inqArea : 1;
    let areaMatch = false;
    if (inqArea === 0 || propAvailArea >= inqArea) {
      score += 30;
      areaMatch = true;
      details.push(
        `✓ Area Match: ${propAvailArea.toLocaleString()} sq.ft available ${inqArea > 0 ? `(Needs ${inqArea.toLocaleString()} sq.ft)` : ''}`
      );
    } else if (areaRatio >= 0.75) {
      score += 20;
      areaMatch = true;
      details.push(
        `~ Partial Area: ${propAvailArea.toLocaleString()} sq.ft available (${Math.round(areaRatio * 100)}% of requirement)`
      );
    } else {
      details.push(
        `✕ Area Insufficient: ${propAvailArea.toLocaleString()} sq.ft available (<75% of requirement)`
      );
    }

    // 3. Docks Compatibility (Weight: 15%)
    const propDocks = Number(prop.docksCount) || 0;
    const docksMatch = propDocks >= inqDocks;
    if (docksMatch) {
      score += 15;
      details.push(`✓ Docks: ${propDocks} dock doors available (Meets requirement of ${inqDocks})`);
    } else {
      details.push(`~ Docks: ${propDocks} dock doors available (Under requested ${inqDocks})`);
    }

    // 4. Timeline Availability (Weight: 15%)
    const timelineMatch = true;
    score += 15;
    details.push(`✓ Availability: ${prop.availabilityDate || 'Immediate occupancy'}`);

    // 5. Industry Compatibility (Weight: 10%)
    let industryMatch = false;
    const suitable = Array.isArray(prop.suitableIndustries)
      ? prop.suitableIndustries.map((s) => s.toLowerCase())
      : [];
    if (!inqIndustry || suitable.length === 0 || suitable.some((s) => inqIndustry.includes(s) || s.includes(inqIndustry))) {
      score += 10;
      industryMatch = true;
      details.push(`✓ Industry: Suitable for ${inquiry.industry || 'General Industrial / Logistics'}`);
    } else {
      details.push(`✕ Industry: Primarily zoned for ${prop.suitableIndustries.slice(0, 2).join(', ')}`);
    }

    results.push({
      property: prop,
      overallScore: Math.min(100, score),
      matchBreakdown: {
        locationMatch,
        areaMatch,
        docksMatch,
        timelineMatch,
        industryMatch,
        details,
      },
    });
  }

  // Sort descending by overall match score
  return results.sort((a, b) => b.overallScore - a.overallScore);
}

export default matchPropertiesForInquiry;
