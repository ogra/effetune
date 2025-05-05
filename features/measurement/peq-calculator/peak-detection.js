/**
 * Peak and dip detection functions for frequency response processing.
 */

/**
 * Find peaks and dips in the frequency response.
 * @param {number[]} freq - Array of frequency values.
 * @param {number[]} magDb - Array of magnitude values in dB (should be normalized around 0 dB).
 * @param {number} [threshold=1.5] - Minimum prominence in dB to consider a peak/dip.
 * @param {number} [minAbsolutePeak=0.5] - Minimum absolute magnitude in dB for a peak/dip to be considered.
 * @returns {number[]} Indices of significant peaks and dips, sorted by absolute magnitude.
 */
export function findPeaksDips(freq, magDb, threshold = 1.5, minAbsolutePeak = 0.5) {
    const n = magDb.length;
    if (n < 3) return []; // Need at least 3 points

    const peaks = [];
    const dips = [];

    // Check the first point (low end) if it could be a peak or dip
    if (n > 1) {
        const first = magDb[0];
        const second = magDb[1];
        
        if ((first > second && first > minAbsolutePeak) || (first < second && first < -minAbsolutePeak)) {
            if (first > 0) peaks.push(0); else dips.push(0);
        }
    }

    // Find local maxima (peaks) and minima (dips)
    for (let i = 1; i < n - 1; i++) {
        const current = magDb[i];
        const prev = magDb[i - 1];
        const next = magDb[i + 1];

        if (current > prev && current > next && current > minAbsolutePeak) {
            peaks.push(i); // Potential peak
        } else if (current < prev && current < next && current < -minAbsolutePeak) {
            dips.push(i); // Potential dip
        }
        // Handle plateaus: check if it's higher/lower than neighbors further away
        else if (current === next && current !== prev) {
            let k = i + 1;
            while (k < n - 1 && magDb[k] === current) {
                k++;
            }
            if (k < n && ((current > prev && current > magDb[k] && current > minAbsolutePeak) || (current < prev && current < magDb[k] && current < -minAbsolutePeak))) {
               const plateauCenter = Math.floor((i + k -1) / 2);
               if (current > 0) peaks.push(plateauCenter); else dips.push(plateauCenter);
               i = k - 1; // Skip the rest of the plateau
            }
        }
    }

    // Check the last point (high end) if it could be a peak or dip
    if (n > 1) {
        const last = magDb[n - 1];
        const secondLast = magDb[n - 2];
        
        if ((last > secondLast && last > minAbsolutePeak) || (last < secondLast && last < -minAbsolutePeak)) {
            if (last > 0) peaks.push(n - 1); else dips.push(n - 1);
        }
    }

    // Combine peaks and dips into candidates
    const candidates = [...peaks, ...dips].map(index => ({ index, magnitude: magDb[index] }));

    // Calculate prominence for each candidate
    const significantIndices = [];
    for (const candidate of candidates) {
        const i = candidate.index;
        const currentMag = candidate.magnitude;
        const isPeak = currentMag > 0;

        // Find the reference level for prominence calculation
        // Search left and right for the lowest point (for peaks) or highest point (for dips)
        // until we hit a point higher (for peaks) or lower (for dips) than the candidate itself.

        let leftMin = currentMag; // For peaks
        let leftMax = currentMag; // For dips
        let leftBound = 0;
        
        // Special handling for leftward search when at index 0 (low end)
        if (i === 0) {
            // For the low end, we can't search left, so we use current value
            leftMin = currentMag;
            leftMax = currentMag;
            leftBound = 0;
        } else {
            // Normal leftward search
            for (let j = i - 1; j >= 0; j--) {
                if ((isPeak && magDb[j] > currentMag) || (!isPeak && magDb[j] < currentMag)) {
                    leftBound = j; // Found the bounding higher/lower point
                    break;
                }
                if (isPeak) leftMin = Math.min(leftMin, magDb[j]);
                else leftMax = Math.max(leftMax, magDb[j]);
                leftBound = j; // Keep track of the search extent
            }
        }

        let rightMin = currentMag; // For peaks
        let rightMax = currentMag; // For dips
        let rightBound = n - 1;
        
        // Special handling for rightward search when at index n-1 (high end)
        if (i === n - 1) {
            // For the high end, we can't search right, so we use current value
            rightMin = currentMag;
            rightMax = currentMag;
            rightBound = n - 1;
        } else {
            // Normal rightward search
            for (let j = i + 1; j < n; j++) {
                if ((isPeak && magDb[j] > currentMag) || (!isPeak && magDb[j] < currentMag)) {
                    rightBound = j; // Found the bounding higher/lower point
                    break;
                }
                if (isPeak) rightMin = Math.min(rightMin, magDb[j]);
                else rightMax = Math.max(rightMax, magDb[j]);
                rightBound = j; // Keep track of the search extent
            }
        }

        // The prominence baseline is the higher of the two minima (for peaks)
        // or the lower of the two maxima (for dips) found during the search.
        let baseLevel;
        let prominence;
        
        // Special handling for endpoints to avoid setting their prominence to zero
        if (i === 0 || i === n - 1) {
            // For endpoints, use just the one-sided search result
            // This prevents endpoints from getting zero prominence
            if (i === 0) {
                // Low end - use only rightward search
                baseLevel = isPeak ? rightMin : rightMax;
            } else {
                // High end - use only leftward search
                baseLevel = isPeak ? leftMin : leftMax;
            }
            // Calculate prominence using one-sided baseline
            prominence = Math.abs(currentMag - baseLevel);
            
            // Optionally, reduce threshold for endpoints to make them more likely to be included
            // Only do this if prominence would otherwise be below the threshold
            if (prominence < threshold && prominence >= threshold * 0.75) {
                prominence = threshold; // Force it to just meet the threshold
            }
        } else {
            // Normal case - use both sides
            baseLevel = isPeak ? Math.max(leftMin, rightMin) : Math.min(leftMax, rightMax);
            prominence = Math.abs(currentMag - baseLevel);
        }

        if (prominence >= threshold && Math.abs(currentMag) >= minAbsolutePeak) {
            significantIndices.push({
                index: i,
                magnitude: Math.abs(currentMag), // Sort by absolute magnitude
                prominence: prominence
            });
        }
    }

    // Sort by prominence first, then by absolute magnitude (descending)
    significantIndices.sort((a, b) => {
        const promDiff = b.prominence - a.prominence;
        if (Math.abs(promDiff) > 0.1) { // Use prominence if difference is significant
            return promDiff;
        } else {
            return b.magnitude - a.magnitude; // Otherwise use magnitude
        }
    });

    // Return only the indices
    return significantIndices.map(item => item.index);
} 