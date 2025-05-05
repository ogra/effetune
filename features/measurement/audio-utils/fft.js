/**
 * Simple FFT implementation for frequency analysis
 */
class FFT {
    constructor(size) {
        this.size = size;
        this.cosTable = new Float32Array(size);
        this.sinTable = new Float32Array(size);
        this.reverseTable = new Uint32Array(size);
        
        // Precompute tables
        this.generateReverseTable();
        this.generateTrigTables();
    }
    
    generateReverseTable() {
        const size = this.size;
        const bits = Math.log2(size);
        
        // Generate bit reversal table properly
        for (let i = 0; i < size; i++) {
            let rev = 0;
            let val = i;
            
            // Reverse the bits of i
            for (let j = 0; j < bits; j++) {
                // Left shift rev by 1 and OR with LSB of val
                rev = (rev << 1) | (val & 1);
                // Right shift val by 1 to process next bit
                val = val >> 1;
            }
            
            this.reverseTable[i] = rev;
        }
    }
    
    generateTrigTables() {
        const tableSize = this.size;
        for (let i = 0; i < tableSize; i++) {
            // For FFT
            const angle = -2 * Math.PI * i / tableSize;
            this.cosTable[i] = Math.cos(angle);
            this.sinTable[i] = Math.sin(angle);
        }
    }
    
    /**
     * Performs a forward FFT transform
     * @param {Float32Array} realOut - Output real part
     * @param {Float32Array} imagOut - Output imaginary part
     * @param {Float32Array} realIn - Input real part
     * @param {Float32Array} imagIn - Input imaginary part (optional)
     */
    transform(realOut, imagOut, realIn, imagIn) {
        const size = this.size;
        
        // Bit reversal
        for (let i = 0; i < size; i++) {
            const rev = this.reverseTable[i];
            realOut[i] = realIn[rev];
            imagOut[i] = imagIn ? imagIn[rev] : 0;
        }
        
        // Butterfly iterations
        for (let len = 2; len <= size; len <<= 1) {
            const halfLen = len >> 1;
            const step = size / len;
            
            // Loop through each butterfly group
            for (let i = 0; i < size; i += len) {
                // Loop through each butterfly in the group
                for (let j = 0; j < halfLen; j++) {
                    const idx = j * step;
                    const cos = this.cosTable[idx];
                    const sin = this.sinTable[idx];
                    
                    const a = i + j;
                    const b = a + halfLen;
                    
                    const aReal = realOut[a];
                    const aImag = imagOut[a];
                    const bReal = realOut[b];
                    const bImag = imagOut[b];
                    
                    const tReal = bReal * cos - bImag * sin;
                    const tImag = bReal * sin + bImag * cos;
                    
                    realOut[a] = aReal + tReal;
                    imagOut[a] = aImag + tImag;
                    realOut[b] = aReal - tReal;
                    imagOut[b] = aImag - tImag;
                }
            }
        }
    }
    
    /**
     * Performs an inverse FFT transform
     * @param {Float32Array} realOut - Output real part
     * @param {Float32Array} imagOut - Output imaginary part
     * @param {Float32Array} realIn - Input real part
     * @param {Float32Array} imagIn - Input imaginary part
     */
    inverseTransform(realOut, imagOut, realIn, imagIn) {
        const size = this.size;
        
        // For IFFT, we first conjugate the input
        const tempRealIn = new Float32Array(size);
        const tempImagIn = new Float32Array(size);
        
        for (let i = 0; i < size; i++) {
            tempRealIn[i] = realIn[i];
            tempImagIn[i] = -imagIn[i]; // Conjugate
        }
        
        // Perform forward FFT on conjugated input
        this.transform(realOut, imagOut, tempRealIn, tempImagIn);
        
        // Conjugate the output and scale by 1/N
        for (let i = 0; i < size; i++) {
            realOut[i] = realOut[i] / size;
            imagOut[i] = -imagOut[i] / size; // Conjugate and scale
        }
    }
}

export default FFT; 