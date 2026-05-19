const labels = {
  draft: '草稿',
  published: '已发布',
  online: '线上运行',
  full_online: '全量线上',
  canary_online: '灰度线上',
  offline: '已下线',
  ab_testing: 'AB实验中',
  running: '运行中',
  completed: '已完成',
  paused: '已暂停',
}

export default function StatusBadge({ status }) {
  return <span className={`status-badge ${status}`}>{labels[status] || status}</span>
}
