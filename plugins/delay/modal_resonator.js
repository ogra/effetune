class ModalResonatorPlugin extends PluginBase {
    constructor() {
        super('Modal Resonator', 'Frequency resonance effect with up to 5 resonators');

        this.en = true;
        this.rs = Array(5).fill(null).map((_, i) => ({
            en: true,
            fr: this._getInitialFreq(i),
            dc: this._getInitialDecay(i),
            lp: this._getInitialLpf(i),
            hp: this._getInitialHpf(i),
            gn: -12
        }));
        this.mx = 20;
        this.sr = 0;

        const LOG_20 = Math.log(20);
        const LOG_20000 = Math.log(20000);
        const LOG_RANGE_RECIP = 1 / (LOG_20000 - LOG_20);
        const TWO_PI = 2 * Math.PI;

        // Register the audio processor
        this.registerProcessor(`
            // Processor constants
            const LOG_20 = 2.995732273553991;          // log(20)
            const LOG_20000 = 9.903487552536127;         // log(20000)
            const LOG_RANGE_RECIP = 1.0 / (LOG_20000 - LOG_20);
            const LOG_0_001 = -6.907755278982137;         // log(0.001) for -60dB
            const TWO_PI = 6.283185307179586;            // 2 * PI
        
            if (!parameters.en) return data;
        
            const sampleRate = parameters.sampleRate;
            const invSampleRate = 1.0 / sampleRate;
            const channelCount = parameters.channelCount;
            const blockSize = parameters.blockSize;
        
            const mix = parameters.mx;
            const wetGain = mix < 50 ? mix * 0.02 : 1.0;
            const dryGain = mix < 50 ? 1.0 : (100 - mix) * 0.02;
        
            if (!context.initialized ||
                context.channelCount !== channelCount ||
                context.sampleRate !== sampleRate)
            {
                const maxDelaySamples = Math.ceil(sampleRate / 20.0855);
                context.delayBuffers = new Array(channelCount);
                context.delayPositions = new Array(channelCount);
                context.lpfStates = new Array(channelCount);
                context.hpfStates = new Array(channelCount);
                for (let ch = 0; ch < channelCount; ++ch) {
                    context.delayBuffers[ch] = new Array(5);
                    context.delayPositions[ch] = new Uint32Array(5);
                    context.lpfStates[ch] = new Float32Array(5);
                    context.hpfStates[ch] = new Float32Array(5);
                    for (let r = 0; r < 5; ++r) {
                        context.delayBuffers[ch][r] = new Float32Array(maxDelaySamples);
                    }
                }
                context.accum = new Float32Array(blockSize);
                context.channelCount = channelCount;
                context.sampleRate = sampleRate;
                context.initialized = true;
            }
        
            let activeCount = 0;
            const resonatorParams = new Array(5);
            for (let r = 0; r < 5; ++r) {
                const resParamInput = parameters.rs[r];
                if (!resParamInput.en) {
                    resonatorParams[r] = null;
                    continue;
                }
                activeCount++;
        
                const freqHz = Math.exp(resParamInput.fr);
                const lpfHz = Math.exp(resParamInput.lp);
                const hpfHz = Math.exp(resParamInput.hp);
                const delaySamples = Math.max(1, (sampleRate / freqHz) | 0);
                const decayTimeSamples = resParamInput.dc * 0.001 * sampleRate;
                const periodsInDecay = Math.max(0.1, decayTimeSamples / delaySamples);
                let feedback = Math.exp(LOG_0_001 / periodsInDecay);
                feedback = Math.min(feedback, 0.999);
                const lpfCoeff = Math.exp(-TWO_PI * lpfHz * invSampleRate);
                const lpfCoeffInv = 1.0 - lpfCoeff;
                const hpfCoeff = Math.exp(-TWO_PI * hpfHz * invSampleRate);
                const hpfCoeffInv = 1.0 - hpfCoeff;
                const feedbackScaled = feedback;
                
                // Convert gain from dB to linear amplitude factor
                // Range: -18 to +18 dB
                const gainDB = resParamInput.gn;
                const gainLinear = Math.pow(10, gainDB / 20.0);
        
                resonatorParams[r] = {
                    delaySamples: delaySamples,
                    lpfCoeff: lpfCoeff,
                    lpfCoeffInv: lpfCoeffInv,
                    hpfCoeff: hpfCoeff,
                    hpfCoeffInv: hpfCoeffInv,
                    feedbackScaled: feedbackScaled,
                    gainLinear: gainLinear
                };
            }
        
            const delayBuffers = context.delayBuffers;
            const delayPositions = context.delayPositions;
            const lpfStates = context.lpfStates;
            const hpfStates = context.hpfStates;
            const accum = context.accum;
        
            for (let ch = 0; ch < channelCount; ++ch) {
                const offset = ch * blockSize;
                accum.fill(0.0);
                const channelDelayBuffers = delayBuffers[ch];
                const channelDelayPositions = delayPositions[ch];
                const channelLpfStates = lpfStates[ch];
                const channelHpfStates = hpfStates[ch];
        
                for (let r = 0; r < 5; ++r) {
                    const params = resonatorParams[r];
                    if (!params) continue;
                    const delayBuffer = channelDelayBuffers[r];
                    const delayBufferLength = delayBuffer.length;
                    let delayPos = channelDelayPositions[r];
                    let lpfState = channelLpfStates[r];
                    let hpfState = channelHpfStates[r];
                    const delaySamples = params.delaySamples;
                    const feedbackScaled = params.feedbackScaled;
                    const lpfCoeff = params.lpfCoeff;
                    const lpfCoeffInv = params.lpfCoeffInv;
                    const hpfCoeff = params.hpfCoeff;
                    const hpfCoeffInv = params.hpfCoeffInv;
                    const gainLinear = params.gainLinear;
                    
                    for (let i = 0; i < blockSize; ++i) {
                        const inputSample = data[offset + i];
                        let readPos = delayPos - delaySamples;
                        if (readPos < 0) {
                            readPos += delayBufferLength;
                        }
                        const delaySample = delayBuffer[readPos];
                        
                        // Apply the gain to the resonator output directly
                        accum[i] += delaySample * gainLinear;
                        
                        // Apply LPF to the delayed signal for feedback path
                        lpfState = delaySample * lpfCoeffInv + lpfState * lpfCoeff;
                        
                        // Apply HPF (simple one-pole HPF) to the LPF output
                        const hpfOutput = hpfCoeffInv * (lpfState - hpfState);
                        hpfState = hpfState * hpfCoeff + hpfOutput;
                        
                        // Use filtered output for feedback path
                        delayBuffer[delayPos] = inputSample + hpfOutput * feedbackScaled;
                        delayPos++;
                        if (delayPos >= delayBufferLength) {
                            delayPos = 0;
                        }
                    }
                    channelDelayPositions[r] = delayPos;
                    channelLpfStates[r] = lpfState;
                    channelHpfStates[r] = hpfState;
                }
                for (let i = 0; i < blockSize; ++i) {
                    const inputSample = data[offset + i];
                    data[offset + i] = inputSample * dryGain + accum[i] * wetGain;
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

    _getInitialHpf(index) {
        const freqValues = [400, 900, 1600, 3000, 6500];
        const hpfValues = freqValues.map(f => Math.max(20, Math.round(f / 2)));
        return Number(Math.log(hpfValues[index]).toFixed(2));
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
                    if (resonator.hp !== undefined) {
                        const hp = Number(resonator.hp);
                        if (!isNaN(hp)) {
                            this.rs[index].hp = Math.max(3.00, Math.min(9.90, hp));
                        }
                    }
                    if (resonator.gn !== undefined) {
                        const gn = Number(resonator.gn);
                        if (!isNaN(gn)) {
                            this.rs[index].gn = Math.max(-18, Math.min(18, gn));
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
                if (resParams.hp !== undefined) {
                    const hpf = Number(resParams.hp);
                    if (!isNaN(hpf)) {
                        resonator.hp = Math.max(3.00, Math.min(9.90, hpf));
                        updated = true;
                    }
                }
                if (resParams.gn !== undefined) {
                    const gain = Number(resParams.gn);
                    if (!isNaN(gain)) {
                        resonator.gn = Math.max(-18, Math.min(18, gain));
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
            if (param === 'fr' || param === 'lp' || param === 'hp') {
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
                if (param === 'fr' || param === 'lp' || param === 'hp') {
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
                    inputVal = (param === 'fr' || param === 'lp' || param === 'hp') ? Math.round(Math.exp(this.rs[resonatorIndex][param])) : this.rs[resonatorIndex][param];
                }
                if (param === 'fr' || param === 'lp' || param === 'hp') {
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
            paramUI.appendChild(createResonatorRow(
                'HPF Freq (Hz):', 3.00, 9.90, 0.01, resonator.hp, 'hp', i
            ));
            paramUI.appendChild(createResonatorRow(
                'Gain (dB):', -18, 18, 0.1, resonator.gn, 'gn', i
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
