class ModalResonatorPlugin extends PluginBase {
    constructor() {
        super('Modal Resonator', 'Frequency resonance effect with up to 5 resonators');

        this.en = true;
        this.rs = Array(5).fill(null).map((_, i) => ({
            en: true,
            fr: this._getInitialFreq(i),
            dc: this._getInitialDecay(i),
            lp: this._getInitialLpf(i)
        }));
        this.mx = 50;
        this.sr = 0;

        const LOG_20 = Math.log(20);
        const LOG_20000 = Math.log(20000);
        const LOG_RANGE_RECIP = 1 / (LOG_20000 - LOG_20);
        const TWO_PI = 2 * Math.PI;

        this.registerProcessor(`
            if (!parameters.en) return data;

            const sampleRate = parameters.sampleRate;
            const invSampleRate = 1.0 / sampleRate;
            const channelCount = parameters.channelCount;
            const blockSize = parameters.blockSize;

            const mix = parameters.mx;
            const wetGain = mix * 0.01;
            const dryGain = 1.0 - wetGain;

            if (!context.initialized ||
                context.channelCount !== channelCount ||
                context.sampleRate !== sampleRate) {
                const maxDelaySamples = Math.ceil(sampleRate / Math.exp(3.00));
                context.delayBuffers = Array(channelCount).fill(null).map(() =>
                    Array(5).fill(null).map(() => new Float32Array(maxDelaySamples))
                );
                context.delayPositions = Array(channelCount).fill(null).map(() => new Uint32Array(5).fill(0));
                context.lpfStates = Array(channelCount).fill(null).map(() => new Float32Array(5).fill(0.0));
                context.channelCount = channelCount;
                context.sampleRate = sampleRate;
                context.initialized = true;
            }

            let activeCount = 0;
            const resonatorParams = parameters.rs.map(r => {
                if (!r.en) return null;
                activeCount++;
                const freqHz = Math.exp(r.fr);
                const lpfHz = Math.exp(r.lp);
                const delaySamples = Math.max(1, Math.trunc(sampleRate / freqHz));
                const decayTimeSamples = r.dc * 0.001 * sampleRate;
                const normalizedFreq = (Math.log(freqHz) - ${LOG_20}) * ${LOG_RANGE_RECIP};
                const adjustedDecayTime = Math.max(1.0, decayTimeSamples * (1.0 - normalizedFreq * 0.7));
                const periodsInDecay = Math.max(0.1, adjustedDecayTime / delaySamples);
                let feedback = Math.exp(${Math.log(0.001)} / periodsInDecay);
                const safetyLimit = 0.999;
                feedback = Math.min(feedback, safetyLimit);
                const lpfCoeff = Math.exp(-${TWO_PI} * lpfHz * invSampleRate);
                const lpfCoeffInv = 1.0 - lpfCoeff;
                const feedbackScaling = Math.max(0.1, 1.0 - normalizedFreq * 0.5);

                return {
                    delaySamples: delaySamples,
                    feedback: feedback,
                    lpfCoeff: lpfCoeff,
                    lpfCoeffInv: lpfCoeffInv,
                    feedbackScaled: feedback * feedbackScaling
                };
            });

            const scaleFactor = activeCount > 0 ? 1.0 / activeCount : 0.0;
            const outWetGain = scaleFactor * wetGain;

            for (let ch = 0; ch < channelCount; ch++) {
                const offset = ch * blockSize;
                const channelDelayBuffers = context.delayBuffers[ch];
                const channelDelayPositions = context.delayPositions[ch];
                const channelLpfStates = context.lpfStates[ch];

                const accum = new Float32Array(blockSize);

                for (let r = 0; r < 5; r++) {
                    const params = resonatorParams[r];
                    if (!params) continue;

                    const delayBuffer = channelDelayBuffers[r];
                    const delayBufferLength = delayBuffer.length;
                    let delayPos = channelDelayPositions[r];
                    let lpfState = channelLpfStates[r];
                    const delaySamples = params.delaySamples;

                    for (let i = 0; i < blockSize; i++) {
                        const inputSample = data[offset + i];
                        const readPos = (delayPos + delayBufferLength - delaySamples) % delayBufferLength;
                        const delaySample = delayBuffer[readPos];

                        lpfState = delaySample * params.lpfCoeffInv + lpfState * params.lpfCoeff;
                        accum[i] += lpfState;
                        delayBuffer[delayPos] = inputSample + lpfState * params.feedbackScaled;

                        delayPos = (delayPos + 1) % delayBufferLength;
                    }

                    channelDelayPositions[r] = delayPos;
                    channelLpfStates[r] = lpfState;
                }

                for (let i = 0; i < blockSize; i++) {
                    const inputSample = data[offset + i];
                    data[offset + i] = inputSample * dryGain + accum[i] * outWetGain;
                }
            }

            return data;
        `);
    }

    _getInitialFreq(index) {
        const freqValues = [400, 900, 1600, 3000, 6500];
        return Number(Math.log(freqValues[index]).toFixed(2));
    }

    _getInitialDecay(index) {
        return [100, 80, 60, 45, 30][index];
    }

    _getInitialLpf(index) {
        const lpfValues = [2000, 2500, 3000, 3500, 4000];
        return Number(Math.log(lpfValues[index]).toFixed(2));
    }

    getParameters() {
        return {
            type: this.constructor.name,
            en: this.en,
            rs: this.rs,
            mx: this.mx,
            sr: this.sr
        };
    }

    setParameters(params) {
        let updated = false;

        if (params.en !== undefined) {
            this.en = Boolean(params.en);
            updated = true;
        }

        if (params.mx !== undefined) {
            const newMix = Number(params.mx);
            if (!isNaN(newMix)) {
                this.mx = Math.max(0, Math.min(100, newMix));
                updated = true;
            }
        }

        if (params.sr !== undefined) {
            const index = Number(params.sr);
            if (!isNaN(index) && index >= 0 && index < 5) {
                this.sr = Math.floor(index);
                updated = true;
            }
        }

        if (params.rs !== undefined && Array.isArray(params.rs)) {
            params.rs.forEach((resonator, index) => {
                if (index < this.rs.length && resonator) {
                    if (resonator.en !== undefined) {
                        this.rs[index].en = Boolean(resonator.en);
                    }
                    if (resonator.fr !== undefined) {
                        const fr = Number(resonator.fr);
                        if (!isNaN(fr)) {
                            this.rs[index].fr = Math.max(3.00, Math.min(9.90, fr));
                        }
                    }
                    if (resonator.dc !== undefined) {
                        const dc = Number(resonator.dc);
                        if (!isNaN(dc)) {
                            this.rs[index].dc = Math.max(1, Math.min(500, dc));
                        }
                    }
                    if (resonator.lp !== undefined) {
                        const lp = Number(resonator.lp);
                        if (!isNaN(lp)) {
                            this.rs[index].lp = Math.max(3.00, Math.min(9.90, lp));
                        }
                    }
                }
            });
            updated = true;
        }

        if (params.resonatorIndex !== undefined && params.resonatorParams) {
            const index = Number(params.resonatorIndex);
            if (!isNaN(index) && index >= 0 && index < 5) {
                const resonator = this.rs[index];
                const resParams = params.resonatorParams;

                if (resParams.en !== undefined) {
                    resonator.en = Boolean(resParams.en);
                    updated = true;
                }
                if (resParams.fr !== undefined) {
                    const freq = Number(resParams.fr);
                    if (!isNaN(freq)) {
                        resonator.fr = Math.max(3.00, Math.min(9.90, freq));
                        updated = true;
                    }
                }
                if (resParams.dc !== undefined) {
                    const decay = Number(resParams.dc);
                    if (!isNaN(decay)) {
                        resonator.dc = Math.max(1, Math.min(500, decay));
                        updated = true;
                    }
                }
                if (resParams.lp !== undefined) {
                    const lpf = Number(resParams.lp);
                    if (!isNaN(lpf)) {
                        resonator.lp = Math.max(3.00, Math.min(9.90, lpf));
                        updated = true;
                    }
                }
            }
        }

        if (updated) {
            this.updateParameters();
        }
    }

    createUI() {
        const container = document.createElement('div');
        container.className = 'plugin-parameter-ui';
        container.id = this.id;

        const resonatorContainer = document.createElement('div');
        resonatorContainer.className = 'modal-resonator-container';

        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'modal-resonator-frame';

        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'modal-resonator-tabs';

        const contentContainer = document.createElement('div');

        const createResonatorRow = (label, min, max, step, value, param, resonatorIndex) => {
            const row = document.createElement('div');
            row.className = 'parameter-row';

            const labelEl = document.createElement('label');
            labelEl.textContent = label;
            row.appendChild(labelEl);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;

            const input = document.createElement('input');
            input.type = 'number';
            if (param === 'fr' || param === 'lp') {
                input.min = Math.round(Math.exp(min));
                input.max = Math.round(Math.exp(max));
                input.step = 1;
                input.value = Math.round(Math.exp(value));
            } else {
                input.min = min;
                input.max = max;
                input.step = step;
                input.value = value;
            }

            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (param === 'fr' || param === 'lp') {
                    input.value = Math.round(Math.exp(val));
                } else {
                    input.value = val;
                }
                const params = {};
                params[param] = val;
                this.setParameters({
                    resonatorIndex: resonatorIndex,
                    resonatorParams: params
                });
            });

            input.addEventListener('input', (e) => {
                let inputVal = parseFloat(e.target.value);
                let paramVal;
                if (isNaN(inputVal)) {
                    inputVal = (param === 'fr' || param === 'lp') ? Math.round(Math.exp(this.rs[resonatorIndex][param])) : this.rs[resonatorIndex][param];
                }
                if (param === 'fr' || param === 'lp') {
                    const minHz = Math.round(Math.exp(min));
                    const maxHz = Math.round(Math.exp(max));
                    inputVal = Math.max(minHz, Math.min(maxHz, inputVal));
                    paramVal = Math.log(inputVal);
                    paramVal = Math.max(min, Math.min(max, parseFloat(paramVal.toFixed(2))));
                    e.target.value = Math.round(inputVal);
                } else {
                    paramVal = Math.max(min, Math.min(max, inputVal));
                    e.target.value = paramVal;
                }
                slider.value = paramVal;
                const params = {};
                params[param] = paramVal;
                this.setParameters({
                    resonatorIndex: resonatorIndex,
                    resonatorParams: params
                });
            });

            row.appendChild(slider);
            row.appendChild(input);
            return row;
        };

        for (let i = 0; i < 5; i++) {
            const tab = document.createElement('button');
            tab.className = `modal-resonator-tab ${i === this.sr ? 'active' : ''}`;
            tab.textContent = `Resonator ${i + 1}`;

            tab.onclick = () => {
                const pluginUI = document.getElementById(this.id);
                if (!pluginUI) return;

                pluginUI.querySelectorAll('.modal-resonator-tab').forEach(el => el.classList.remove('active'));
                pluginUI.querySelectorAll('.modal-resonator-content').forEach(el => el.classList.remove('active'));

                tab.classList.add('active');
                const content = pluginUI.querySelector(`.modal-resonator-content[data-index="${i}"]`);
                if (content) {
                    content.classList.add('active');
                }
                this.setParameters({ sr: i });
            };

            tabsContainer.appendChild(tab);

            const content = document.createElement('div');
            content.className = `modal-resonator-content ${i === this.sr ? 'active' : ''}`;
            content.setAttribute('data-index', i);

            const paramUI = document.createElement('div');
            paramUI.className = 'plugin-parameter-ui';
            content.appendChild(paramUI);

            const resonator = this.rs[i];

            const enableRow = document.createElement('div');
            enableRow.className = 'parameter-row';
            const enableLabel = document.createElement('label');
            enableLabel.textContent = 'Enable:';
            enableRow.appendChild(enableLabel);

            const enableCheckbox = document.createElement('input');
            enableCheckbox.type = 'checkbox';
            enableCheckbox.checked = resonator.en;
            enableCheckbox.onchange = (e) => {
                this.setParameters({
                    resonatorIndex: i,
                    resonatorParams: { en: e.target.checked }
                });
            };
            enableRow.appendChild(enableCheckbox);
            paramUI.appendChild(enableRow);

            paramUI.appendChild(createResonatorRow(
                'Freq (Hz):', 3.00, 9.90, 0.01, resonator.fr, 'fr', i
            ));
            paramUI.appendChild(createResonatorRow(
                'Decay (ms):', 1, 500, 1, resonator.dc, 'dc', i
            ));
            paramUI.appendChild(createResonatorRow(
                'LPF Freq (Hz):', 3.00, 9.90, 0.01, resonator.lp, 'lp', i
            ));

            contentContainer.appendChild(content);
        }

        settingsContainer.appendChild(tabsContainer);
        settingsContainer.appendChild(contentContainer);
        resonatorContainer.appendChild(settingsContainer);
        container.appendChild(resonatorContainer);

        const createMixRow = (labelText, type, min, max, step, value, onChange) => {
            const row = document.createElement('div');
            row.className = 'parameter-row';
            const label = document.createElement('label');
            label.textContent = labelText;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min;
            slider.max = max;
            slider.step = step;
            slider.value = value;

            const input = document.createElement('input');
            input.type = type;
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = value;

            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                onChange(val);
                input.value = val;
            });

            input.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value);
                if (isNaN(val)) {
                    val = this.mx;
                }
                val = Math.max(min, Math.min(max, val));
                onChange(val);
                slider.value = val;
                e.target.value = val;
            });

            row.appendChild(label);
            row.appendChild(slider);
            row.appendChild(input);
            return row;
        };

        container.appendChild(createMixRow('Mix (%):', 'number', 0, 100, 1, this.mx,
            (value) => this.setParameters({ mx: value })));

        return container;
    }
}

window.ModalResonatorPlugin = ModalResonatorPlugin;
