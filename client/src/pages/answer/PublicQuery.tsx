import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Input, message, Spin, Tabs, Tag } from 'antd';
import { useLocation, useParams } from 'react-router-dom';
import { post } from '../../api';
import SchemaRenderer from '../../renderer/SchemaRenderer';
import type { AnswerValue } from '../../renderer/types';
import { isEmptyAnswer } from '../../schema/empty';
import { flattenSchema, type FlatQuestion } from '../../schema/flatten';
import type { SurveySchema } from '../../schema/types';
import { EMPTY, formatAnswer, questionHeader } from '../survey/data/format';

/** 后端 AppConsts.PUBLIC_QUERY_PASSWORD_FIELD_ID */
const PASSWORD_FIELD_ID = 'password';

interface QueryAnswerView {
  answerId?: string;
  answer?: Record<string, unknown>;
  createAt?: string;
}

/** POST /api/public/loadQuery */
interface PublicQueryVerifyView {
  password?: string;
  schema?: SurveySchema;
}

/** POST /api/public/getQueryResult */
interface PublicQueryView {
  schema?: SurveySchema;
  answers?: QueryAnswerView[];
  fieldPermission?: Record<string, number>;
}

export default function PublicQuery() {
  const { id = '', resultId = '' } = useParams();
  const location = useLocation();
  const urlQuery = useMemo(() => {
    const out: Record<string, string> = {};
    new URLSearchParams(location.search).forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }, [location.search]);

  const [loading, setLoading] = useState(true);
  const [querying, setQuerying] = useState(false);
  const [fatal, setFatal] = useState<string>();
  const [formSchema, setFormSchema] = useState<SurveySchema>();
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [submitted, setSubmitted] = useState<Record<string, AnswerValue>>({});
  const [result, setResult] = useState<PublicQueryView>();

  const formQuestions = useMemo(() => (formSchema ? flattenSchema(formSchema) : []), [formSchema]);
  const passwordField = useMemo(
    () => formQuestions.find((q) => q.id === PASSWORD_FIELD_ID),
    [formQuestions],
  );
  const conditionQuestions = useMemo(
    () => formQuestions.filter((q) => q.id !== PASSWORD_FIELD_ID),
    [formQuestions],
  );
  // 密码单独渲染成 Input.Password，避免后端下发的 FillBlank 明文显示
  const renderSchema = useMemo(() => {
    if (!formSchema) return undefined;
    if (!passwordField) return formSchema;
    return {
      ...formSchema,
      children: (formSchema.children ?? []).filter((child) => child.id !== PASSWORD_FIELD_ID),
    };
  }, [formSchema, passwordField]);

  const getResult = useCallback(
    async (answer: Record<string, AnswerValue>) => {
      setQuerying(true);
      try {
        const res = await post<PublicQueryView>('/api/public/getQueryResult', {
          id,
          resultId,
          answer,
          query: urlQuery,
        });
        setResult(res);
        setSubmitted(answer);
      } catch (e) {
        message.error((e as Error).message);
      } finally {
        setQuerying(false);
      }
    },
    [id, resultId, urlQuery],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setFatal(undefined);
    setResult(undefined);
    setSubmitted({});
    setValues({});
    try {
      const view = await post<PublicQueryVerifyView>('/api/public/loadQuery', {
        id,
        resultId,
        query: urlQuery,
      });
      const schema = view.schema;
      setFormSchema(schema);
      if (schema) {
        const keys = Object.keys(urlQuery);
        const fields = flattenSchema(schema);
        // 链接把全部查询条件都带上了：和老版一样直接出结果（后端会用 query 参数拼条件）
        const covered =
          keys.length > 0 &&
          fields.length > 0 &&
          fields.every((q) => (q.schema.children ?? []).some((child) => keys.includes(child.id)));
        if (covered) {
          await getResult({});
        }
      }
    } catch (e) {
      setFatal((e as Error).message || '查询加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, resultId, urlQuery, getResult]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = () => {
    const filled = conditionQuestions.filter((q) => !isEmptyAnswer(values[q.id], true));
    const hasUrlCondition = Object.keys(urlQuery).some((key) =>
      conditionQuestions.some((q) => (q.schema.children ?? []).some((child) => child.id === key)),
    );
    if (conditionQuestions.length > 0 && filled.length === 0 && !hasUrlCondition) {
      message.error('请至少填写一个查询条件');
      return;
    }

    const missing = formQuestions.filter((q) => {
      if (!q.schema.attribute?.required || !isEmptyAnswer(values[q.id], true)) return false;
      // 非密码条件如果已经在 URL 里，视为已提供
      if (
        q.id !== PASSWORD_FIELD_ID &&
        (q.schema.children ?? []).some((child) => urlQuery[child.id] !== undefined)
      ) {
        return false;
      }
      return true;
    });
    if (missing.length > 0) {
      message.error(`请填写「${missing[0].title || missing[0].type}」`);
      return;
    }
    void getResult(values);
  };

  const resultQuestions: FlatQuestion[] = useMemo(() => {
    if (!result?.schema) return [];
    const hidden = new Set(
      Object.entries(result.fieldPermission ?? {})
        .filter(([, permission]) => permission === 0)
        .map(([qId]) => qId),
    );
    return flattenSchema(result.schema).filter((q) => !hidden.has(q.id));
  }, [result]);

  const criteria = useMemo(
    () =>
      conditionQuestions
        .map((q) => {
          const text = formatAnswer(q, submitted[q.id]);
          return text === EMPTY ? undefined : `${q.title || q.type}：${text}`;
        })
        .filter((item): item is string => Boolean(item)),
    [conditionQuestions, submitted],
  );

  const renderAnswerBody = (answer: QueryAnswerView) => {
    if (!resultQuestions.length) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有可展示的题目" />;
    }
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        {resultQuestions.map((q) => {
          const value = (answer.answer ?? {})[q.id] as AnswerValue;
          return (
            <div key={q.id} style={{ borderBottom: '1px dashed var(--bp-line-soft)', paddingBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>{questionHeader(q)}</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                }}
              >
                {formatAnswer(q, value)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const answers = result?.answers ?? [];
  const passwordRaw = values[PASSWORD_FIELD_ID];
  const passwordText =
    passwordRaw && typeof passwordRaw === 'object' && !Array.isArray(passwordRaw)
      ? String((passwordRaw as Record<string, unknown>)[PASSWORD_FIELD_ID] ?? '')
      : '';

  const cardStyle = {
    border: '1px solid var(--bp-line)',
    background: 'rgba(30,58,95,0.55)',
  } as const;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 64px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
        QUERY / 结果查询
      </div>
      <h1
        className="bp-title"
        style={{ fontSize: 20, margin: '6px 0 0', letterSpacing: '0.06em', overflowWrap: 'anywhere' }}
      >
        {formSchema?.title || '公开查询'}
      </h1>
      {formSchema?.description && (
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.7, color: 'rgba(160,196,232,0.75)', overflowWrap: 'anywhere' }}>
          {formSchema.description}
        </div>
      )}

      <hr className="bp-dim" style={{ margin: '14px 0 20px' }} />

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : fatal ? (
        <Alert type="warning" showIcon message="无法打开查询" description={fatal} />
      ) : result ? (
        <Card className="bp-corners" style={cardStyle} styles={{ body: { padding: 20 } }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 13 }}>查询到 {answers.length} 条符合条件的数据</span>
            <div style={{ flex: 1 }} />
            <Button size="small" onClick={() => setResult(undefined)}>
              重新查询
            </Button>
          </div>

          {criteria.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>查询条件：</span>
              {criteria.map((item) => (
                <Tag
                  key={item}
                  style={{ marginInlineEnd: 0, whiteSpace: 'normal', overflowWrap: 'anywhere' }}
                >
                  {item}
                </Tag>
              ))}
            </div>
          )}

          <hr className="bp-dim" style={{ margin: '10px 0 14px' }} />

          {answers.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有查询到数据" />
          ) : answers.length === 1 ? (
            <>
              {answers[0].createAt && (
                <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 10 }}>
                  提交时间：{answers[0].createAt}
                </div>
              )}
              {renderAnswerBody(answers[0])}
            </>
          ) : (
            <Tabs
              items={answers.map((answer, index) => ({
                key: answer.answerId || String(index),
                label: answer.createAt || `记录 ${index + 1}`,
                children: renderAnswerBody(answer),
              }))}
            />
          )}
        </Card>
      ) : formSchema ? (
        <Card className="bp-corners" style={cardStyle} styles={{ body: { padding: 20 } }}>
          {renderSchema && (
            <SchemaRenderer
              schema={renderSchema}
              values={values}
              onChange={(qId, value) => setValues((prev) => ({ ...prev, [qId]: value }))}
              mode="answer"
            />
          )}

          {passwordField && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{passwordField.title || '查询密码'}</span>
                <span style={{ color: 'var(--bp-orange)' }}>*</span>
              </div>
              <Input.Password
                value={passwordText}
                placeholder="请输入查询密码"
                style={{ maxWidth: 380 }}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [PASSWORD_FIELD_ID]: { [PASSWORD_FIELD_ID]: e.target.value },
                  }))
                }
                onPressEnter={submit}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="primary" size="large" loading={querying} onClick={submit}>
              {formSchema.attribute?.submitButton || '查询'}
            </Button>
          </div>
        </Card>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="查询表单不存在" />
      )}
    </div>
  );
}
