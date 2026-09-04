# 怎么加题

题目都放在 `docs/quiz/questions/`：

- 题干、选项、解释写在 `bank.json`
- 示意图放在 `svg/`，文件名和题目的 `figure` 对应

新增一题时，在 `bank.json` 的 `items` 里加一条，全部使用选择题：

```json
{
  "id": "new-id",
  "figure": "svg/new-id.svg",
  "situation": { "inning": "一局上", "outs": 0, "balls": 0, "strikes": 0, "runners": [] },
  "prompt": "题干",
  "options": ["选项甲", "选项乙", "选项丙", "选项丁"],
  "answer": 1,
  "explain": "一两句解释。",
  "ruleHref": "../notes/详细规则/#quiz-force-or-tag",
  "ruleLabel": "触杀与封杀"
}
```

`answer` 是选项序号，从 0 开始。`ruleHref` 指向规则页里已经标好的小节。
