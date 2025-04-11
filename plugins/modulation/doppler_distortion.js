class DopplerDistortionPlugin extends PluginBase {
    constructor() {
        super('Doppler Distortion', 'Simulates Doppler distortion caused by speaker cone movement');

        this.co = 100;
        this.cf = 10.0;
        this.sm = 0.05;
        this.sc = 10000;
        this.df = 1.0;

        this.registerProcessor(`
            if (!parameters.enabled) return data;

            const {
                sampleRate, channelCount, blockSize,
                co: crossover,
                cf: coilForce,
                sm: speakerMass,
                sc: springConstant,
                df: dampingFactor
            } = parameters;

            const SOUND_SPEED = 343000;
            const TWO_PI = Math.PI * 2;
            const dt = 1.0 / sampleRate;
            const halfDt = 0.5 * dt;
            const naturalFreq = Math.sqrt(springConstant / speakerMass);
            const dampingRatio = dampingFactor / (2 * Math.sqrt(speakerMass * springConstant));

            if (!context.initialized || context.channelCount !== channelCount) {
                context.lowpassStates1 = new Array(channelCount).fill().map(() => [0, 0, 0, 0]);
                context.lowpassStates2 = new Array(channelCount).fill().map(() => [0, 0, 0, 0]);
                context.highpassStates1 = new Array(channelCount).fill().map(() => [0, 0, 0, 0]);
                context.highpassStates2 = new Array(channelCount).fill().map(() => [0, 0, 0, 0]);
                context.speakerPositions = new Float32Array(channelCount).fill(0);
                context.speakerVelocities = new Float32Array(channelCount).fill(0);

                const hilbertLength = 64;
                context.hilbertDelayLines = new Array(channelCount).fill().map(() => new Float32Array(hilbertLength));
                context.hilbertIndices = new Int32Array(channelCount);

                context.channelCount = channelCount;
                context.initialized = true;
            }

            const omega = TWO_PI * crossover / sampleRate;
            const cosOmega = Math.cos(omega);
            const alpha = Math.sin(omega) / Math.SQRT2;
            const lpB0 = (1 - cosOmega) / 2;
            const lpB1 = 1 - cosOmega;
            const lpB2 = (1 - cosOmega) / 2;
            const lpA0 = 1 + alpha;
            const lpA1 = -2 * cosOmega;
            const lpA2 = 1 - alpha;
            const lpB0n = lpB0 / lpA0;
            const lpB1n = lpB1 / lpA0;
            const lpB2n = lpB2 / lpA0;
            const lpA1n = lpA1 / lpA0;
            const lpA2n = lpA2 / lpA0;
            const hpB0 = (1 + cosOmega) / 2;
            const hpB1 = -(1 + cosOmega);
            const hpB2 = (1 + cosOmega) / 2;
            const hpA0 = 1 + alpha;
            const hpA1 = -2 * cosOmega;
            const hpA2 = 1 - alpha;
            const hpB0n = hpB0 / hpA0;
            const hpB1n = hpB1 / hpA0;
            const hpB2n = hpB2 / hpA0;
            const hpA1n = hpA1 / hpA0;
            const hpA2n = hpA2 / hpA0;

            const hilbertLength = context.hilbertDelayLines[0].length;
            let hilbertCoeffs = new Float32Array(hilbertLength);
            for (let i = 0; i < hilbertLength; i++) {
                if (i === Math.floor(hilbertLength / 2)) {
                    hilbertCoeffs[i] = 0;
                } else if (i % 2 === 0) {
                    hilbertCoeffs[i] = 0;
                } else {
                    const n = i - Math.floor(hilbertLength / 2);
                    hilbertCoeffs[i] = 2 / (Math.PI * n);
                    const windowPos = i / (hilbertLength - 1);
                    const blackman = 0.42 - 0.5 * Math.cos(2 * Math.PI * windowPos) + 0.08 * Math.cos(4 * Math.PI * windowPos);
                    hilbertCoeffs[i] *= blackman;
                }
            }

            for (let ch = 0; ch < channelCount; ch++) {
                const offset = ch * blockSize;
                const lowpassStates1 = context.lowpassStates1[ch];
                const lowpassStates2 = context.lowpassStates2[ch];
                const highpassStates1 = context.highpassStates1[ch];
                const highpassStates2 = context.highpassStates2[ch];
                const hilbertDelayLine = context.hilbertDelayLines[ch];
                let ringIndex = context.hilbertIndices[ch];
                let speakerPosition = context.speakerPositions[ch];
                let speakerVelocity = context.speakerVelocities[ch];

                for (let i = 0; i < blockSize; i++) {
                    const input = data[offset + i];

                    const lowOutput1 = lpB0n * input + lpB1n * lowpassStates1[0] + lpB2n * lowpassStates1[1]
                                     - lpA1n * lowpassStates1[2] - lpA2n * lowpassStates1[3];
                    lowpassStates1[1] = lowpassStates1[0];
                    lowpassStates1[0] = input;
                    lowpassStates1[3] = lowpassStates1[2];
                    lowpassStates1[2] = lowOutput1;

                    const lowOutput2 = lpB0n * lowOutput1 + lpB1n * lowpassStates2[0] + lpB2n * lowpassStates2[1]
                                     - lpA1n * lowpassStates2[2] - lpA2n * lowpassStates2[3];
                    lowpassStates2[1] = lowpassStates2[0];
                    lowpassStates2[0] = lowOutput1;
                    lowpassStates2[3] = lowpassStates2[2];
                    lowpassStates2[2] = lowOutput2;

                    const highOutput1 = hpB0n * input + hpB1n * highpassStates1[0] + hpB2n * highpassStates1[1]
                                      - hpA1n * highpassStates1[2] - hpA2n * highpassStates1[3];
                    highpassStates1[1] = highpassStates1[0];
                    highpassStates1[0] = input;
                    highpassStates1[3] = highpassStates1[2];
                    highpassStates1[2] = highOutput1;

                    const highOutput2 = hpB0n * highOutput1 + hpB1n * highpassStates2[0] + hpB2n * highpassStates2[1]
                                     - hpA1n * highpassStates2[2] - hpA2n * highpassStates2[3];
                    highpassStates2[1] = highpassStates2[0];
                    highpassStates2[0] = highOutput1;
                    highpassStates2[3] = highpassStates2[2];
                    highpassStates2[2] = highOutput2;

                    const signalForce = lowOutput2 * coilForce;
                    const springForce = -springConstant * speakerPosition;
                    const dampingForce = -dampingFactor * speakerVelocity;
                    const totalForce = signalForce + springForce + dampingForce;
                    const acceleration = totalForce / speakerMass;
                    const halfStepVelocity = speakerVelocity + acceleration * halfDt;
                    speakerPosition += halfStepVelocity * dt;
                    const newSpringForce = -springConstant * speakerPosition;
                    const newDampingForce = -dampingFactor * halfStepVelocity;
                    const newTotalForce = signalForce + newSpringForce + newDampingForce;
                    const newAcceleration = newTotalForce / speakerMass;
                    speakerVelocity = halfStepVelocity + newAcceleration * halfDt;

                    ringIndex = (ringIndex - 1 + hilbertLength) % hilbertLength;
                    hilbertDelayLine[ringIndex] = highOutput2;
                    const realPart = hilbertDelayLine[(ringIndex + 32) % hilbertLength];
                    let imagPart = 0;
                    for (let j = 0; j < hilbertLength; j++) {
                        imagPart += hilbertDelayLine[(ringIndex + j) % hilbertLength] * hilbertCoeffs[j];
                    }
                    const amplitude = Math.sqrt(realPart * realPart + imagPart * imagPart);
                    let phase = Math.atan2(imagPart, realPart);
                    const speakerVelocityMM = speakerVelocity * 1000;
                    const velocityRatio = speakerVelocityMM / SOUND_SPEED;
                    const modulationFactor = velocityRatio * TWO_PI * crossover;
                    phase += modulationFactor;
                    const modulatedHigh = amplitude * Math.cos(phase) * 1.2;
                    data[offset + i] = lowOutput2 + modulatedHigh;
                }
                context.hilbertIndices[ch] = ringIndex;
                context.speakerPositions[ch] = speakerPosition;
                context.speakerVelocities[ch] = speakerVelocity;
            }

            return data;
        `);
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'doppler-distortion-plugin-ui plugin-parameter-ui';

        const createParameterControl = (label, min, max, step, value, setter, unit = '') => {
            const row = document.createElement('div');
            row.className = 'parameter-row';

            const paramName = label.toLowerCase().replace(/\s+/g, '-');
            const sliderId = `${this.id}-${this.name}-${paramName}-slider`;
            const valueId = `${this.id}-${this.name}-${paramName}-value`;

            const labelEl = document.createElement('label');
            labelEl.textContent = `${label}${unit ? ' (' + unit + ')' : ''}:`;
            labelEl.htmlFor = sliderId;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = sliderId;
            slider.name = sliderId;
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;
            slider.autocomplete = "off";

            const valueInput = document.createElement('input');
            valueInput.type = 'number';
            valueInput.id = valueId;
            valueInput.name = valueId;
            valueInput.min = min;
            valueInput.max = max;
            valueInput.step = step;
            valueInput.value = value;
            valueInput.autocomplete = "off";

            slider.addEventListener('input', (e) => {
                setter(parseFloat(e.target.value));
                valueInput.value = e.target.value;
            });

            valueInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) || 0;
                setter(val);
                slider.value = Math.max(min, Math.min(max, val));
            });

            const clampAndUpdate = (e) => {
                const val = parseFloat(e.target.value) || 0;
                const clampedVal = Math.max(min, Math.min(max, val));
                if (clampedVal !== val) {
                    setter(clampedVal);
                    e.target.value = clampedVal;
                    slider.value = clampedVal;
                }
            };
            valueInput.addEventListener('blur', clampAndUpdate);
            valueInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    clampAndUpdate(e);
                }
            });

            row.appendChild(labelEl);
            row.appendChild(slider);
            row.appendChild(valueInput);
            return row;
        };

        container.appendChild(createParameterControl('Crossover', 50, 300, 1, this.co, this.setCo.bind(this), 'Hz'));
        container.appendChild(createParameterControl('Coil Force', 0.0, 100.0, 0.1, this.cf, this.setCf.bind(this), 'N'));
        container.appendChild(createParameterControl('Speaker Mass', 0.001, 0.5, 0.001, this.sm, this.setSm.bind(this), 'kg'));
        container.appendChild(createParameterControl('Spring Constant', 500, 100000, 500, this.sc, this.setSc.bind(this), 'N/m'));
        container.appendChild(createParameterControl('Damping Factor', 0.1, 10.0, 0.1, this.df, this.setDf.bind(this), 'N·s/m'));

        return container;
    }

    getParameters() {
        return {
            ...super.getParameters(),
            co: this.co,
            cf: this.cf,
            sm: this.sm,
            sc: this.sc,
            df: this.df
        };
    }

    setParameters(params) {
        if (params.co !== undefined) {
            this.co = params.co < 50 ? 50 : (params.co > 300 ? 300 : params.co);
        }
        if (params.cf !== undefined) {
            this.cf = params.cf < 0.0 ? 0.0 : (params.cf > 100.0 ? 100.0 : params.cf);
        }
        if (params.sm !== undefined) {
            this.sm = params.sm < 0.001 ? 0.001 : (params.sm > 0.5 ? 0.5 : params.sm);
        }
        if (params.sc !== undefined) {
            this.sc = params.sc < 500 ? 500 : (params.sc > 100000 ? 100000 : params.sc);
        }
        if (params.df !== undefined) {
            this.df = params.df < 0.1 ? 0.1 : (params.df > 10.0 ? 10.0 : params.df);
        }
        if (params.enabled !== undefined) {
            this.enabled = params.enabled;
        }
        this.updateParameters();
    }

    setCo(value) {
        this.setParameters({ co: value });
    }

    setCf(value) {
        this.setParameters({ cf: value });
    }

    setSm(value) {
        this.setParameters({ sm: value });
    }

    setSc(value) {
        this.setParameters({ sc: value });
    }

    setDf(value) {
        this.setParameters({ df: value });
    }
}

window.DopplerDistortionPlugin = DopplerDistortionPlugin;
