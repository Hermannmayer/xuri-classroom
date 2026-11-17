/**
 * 题型注册入口：新增题型 = 组件 + 这里一行。
 * 副作用模块，被应用入口 import 一次即可（main.tsx: import './renderer/registerAll'）。
 */
import { registerQuestion } from './registry';
import Address from './questions/Address';
import Cascader from './questions/Cascader';
import Checkbox from './questions/Checkbox';
import FillBlank from './questions/FillBlank';
import Judge from './questions/Judge';
import MatrixCheckbox from './questions/MatrixCheckbox';
import MatrixFillBlank from './questions/MatrixFillBlank';
import MatrixRadio from './questions/MatrixRadio';
import MultipleBlank from './questions/MultipleBlank';
import Nps from './questions/Nps';
import Radio from './questions/Radio';
import RichText from './questions/RichText';
import Score from './questions/Score';
import Select from './questions/Select';
import Signature from './questions/Signature';
import Textarea from './questions/Textarea';
import Upload from './questions/Upload';

registerQuestion('Radio', Radio);
registerQuestion('Checkbox', Checkbox);
registerQuestion('Select', Select);
registerQuestion('FillBlank', FillBlank);
registerQuestion('Textarea', Textarea);
registerQuestion('Score', Score);
registerQuestion('Judge', Judge);
registerQuestion('MultipleBlank', MultipleBlank);
registerQuestion('Nps', Nps);
registerQuestion('MatrixRadio', MatrixRadio);
registerQuestion('MatrixCheckbox', MatrixCheckbox);
registerQuestion('MatrixFillBlank', MatrixFillBlank);
registerQuestion('Cascader', Cascader);
registerQuestion('Address', Address);
registerQuestion('RichText', RichText);
registerQuestion('Signature', Signature);
registerQuestion('Upload', Upload);
