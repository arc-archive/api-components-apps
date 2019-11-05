import { html } from 'lit-element';
import { accountCircle } from '../../Icons.js';

export const userImageTemplate = (img) => html`<img src="${img}" class="user-icon" alt="Current user profile image"/>`;
export const userIconTemplate = () => html`<span class="user-icon">${accountCircle}</span>`;
