// ==UserScript==
// @name         Animation Name
// @namespace    https://github.com/junkm012/userscripts
// @version      1.0.2
// @description  Add an animation to your name
// @author       Matrix
// @match        *://mpp.8448.space/*
// @match        *://mpp.autoplayer.xyz/*
// @match        *://mppclone.com/*
// @match        *://multiplayerpiano.dev/*
// @match        *://smp.multiplayerpiano.top/*
// @match        *://multiplayerpiano.top/*
// @match        *://multiplayerpiano.net/*
// @match        *://multiplayerpiano.org/*
// @match        *://multiplayerpiano.com/*
// @match        *://mpp.smp-meow.net/*
// @match        *://smnmpp.hri7566.info:8430/*
// @match        *://ompp.daniel9046.tk/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mpp.smp-meow.net
// @grant        none
// @updateURL    https://raw.githubusercontent.com/junkm012/userscripts/refs/heads/main/anim_name.js
// @downloadURL  https://raw.githubusercontent.com/junkm012/userscripts/refs/heads/main/anim_name.js
// ==/UserScript==

;(function() {
    'use strict';
  let base_name = localStorage.getItem('mpp_base_name') || MPP.client.user.name
  let frames = []
  let index = 0
  let is_paused = false
  let is_running = localStorage.getItem('mpp_is_running') === 'false' ? false : true
  let raw_speed_value = Number(localStorage.getItem('mpp_speed')) || 300
  let raw_pause_value = Number(localStorage.getItem('mpp_pause')) || 2000
  let interval_id

  function rebuild_frames() {
    frames = []
    for (let i = 0; i < base_name.length; i++) {
      frames.push(base_name.slice(i) + base_name.slice(0, i))
    }
    frames.push(base_name)
  }

  function compute_move_interval(value) {
    return 1050 - value
  }

  function update_name() {
    if (is_paused || !is_running || !window.MPP || !MPP.client) return
    MPP.client.sendArray([{ m: "userset", set: { name: frames[index] } }])
    index++
    if (index >= frames.length) {
      index = 0
      is_paused = true
      setTimeout(() => { is_paused = false }, raw_pause_value)
    }
  }

  function start_interval() {
    clearInterval(interval_id)
    interval_id = setInterval(update_name, compute_move_interval(raw_speed_value))
  }

  rebuild_frames()
  if (is_running) start_interval()

  const host = document.createElement("div")
  host.id = "mpp-controller-host"
  host.style.position = "fixed"
  host.style.bottom = "60px"
  host.style.right = "20px"
  host.style.zIndex = "9999"
  host.style.pointerEvents = "auto"
  document.body.append(host)

  const shadow = host.attachShadow({ mode: "open" })
  const style = document.createElement("style")
  style.textContent = `
    .controller { background: rgba(30,30,30,0.9); padding:12px; border-radius:8px; display:flex; flex-direction:column; gap:8px; font-family:sans-serif; color:#eee; pointer-events: auto; }
    .row { display:flex; align-items:center; gap:6px; }
    .controller input[type=range] { width:120px; accent-color:#4caf50; pointer-events: auto; }
    .controller input[type=text] { padding:4px 8px; border:none; border-radius:4px; font-size:14px; width:100px; pointer-events: auto; }
    .controller label { font-size:13px; pointer-events: auto; }
    .controller input[type=checkbox] { width:16px; height:16px; accent-color:#4caf50; pointer-events: auto; }
    .value { min-width:30px; text-align:right; font-size:13px; }
  `
  shadow.append(style)
  const container = document.createElement("div")
  container.className = "controller"
  shadow.append(container)

  const base_name_input = document.createElement("input")
  base_name_input.type = "text"
  base_name_input.value = base_name
  base_name_input.tabIndex = 0
  base_name_input.style.pointerEvents = "auto"
  ["keydown","keypress","keyup"].forEach(evt => base_name_input.addEventListener(evt, e => e.stopPropagation()))
  base_name_input.addEventListener("input", function(e) {
    e.stopPropagation()
    base_name = this.value || ""
    localStorage.setItem('mpp_base_name', base_name)
    index = 0
    rebuild_frames()
    if (!is_running && window.MPP && MPP.client) {
      MPP.client.sendArray([{ m: "userset", set: { name: base_name } }])
    }
  })
  container.append(base_name_input)

  function make_slider_control(label_text, min, max, initial, storage_key, oninput_fn) {
    const row = document.createElement("div")
    row.className = "row"
    const label = document.createElement("label")
    label.textContent = label_text
    const input = document.createElement("input")
    input.type = "range"
    input.min = min
    input.max = max
    input.value = initial
    input.style.pointerEvents = "auto"
    const valDisplay = document.createElement("span")
    valDisplay.className = "value"
    valDisplay.textContent = initial
    input.addEventListener("input", function(e) {
      e.stopPropagation()
      const val = Number(this.value)
      valDisplay.textContent = val
      localStorage.setItem(storage_key, val)
      oninput_fn.call(this, e)
    })
    row.append(label, input, valDisplay)
    return row
  }

  const speed_control = make_slider_control("speed", 50, 1000, raw_speed_value, 'mpp_speed', function() {
    raw_speed_value = Number(this.value)
    if (is_running) start_interval()
  })
  container.append(speed_control)

  const pause_control = make_slider_control("pause", 0, 5000, raw_pause_value, 'mpp_pause', function() {
    raw_pause_value = Number(this.value)
  })
  container.append(pause_control)

  const onoff_wrapper = document.createElement("div")
  onoff_wrapper.className = "row"
  const onoff_label = document.createElement("label")
  onoff_label.textContent = "on/off"
  const onoff_input = document.createElement("input")
  onoff_input.type = "checkbox"
  onoff_input.checked = is_running
  onoff_input.addEventListener("change", function(e) {
    e.stopPropagation()
    is_running = this.checked
    localStorage.setItem('mpp_is_running', is_running)
    if (!is_running) {
      clearInterval(interval_id)
      if (window.MPP && MPP.client) {
        MPP.client.sendArray([{ m: "userset", set: { name: base_name } }])
      }
    } else {
      start_interval()
    }
  })
  const statusDisplay = document.createElement("span")
  statusDisplay.className = "value"
  statusDisplay.textContent = is_running ? 'ON' : 'OFF'
  onoff_input.addEventListener('change', () => statusDisplay.textContent = is_running ? 'ON' : 'OFF')
  onoff_wrapper.append(onoff_label, onoff_input, statusDisplay)
  container.append(onoff_wrapper)
})();
