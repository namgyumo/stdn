export const site = {
  title: 'std::N',
  shortName: 'std::N',
  description:
    '저수준을 공부하고 직접 구현하는 걸 좋아하는 동의대 컴소공 25학번. C·C++ 중심으로 메모리·알고리즘·설계 패턴을 파고드는 남규모의 블로그와 포트폴리오.',
  url: import.meta.env.PUBLIC_SITE_URL ?? 'https://std-n.dev',
  locale: 'ko',
  author: {
    name: '남규모',
    handle: 'namgyumo',
    email: 'n.gyumo13@gmail.com',
    // boj: 'mjc5433', // BOJ 서비스 종료로 비활성화
    github: 'https://github.com/namgyumo',
    instagram: 'https://instagram.com/east_scale',
  },
  nav: [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/skills', label: 'Skills' },
    { href: '/blog', label: 'Blog' },
    { href: '/projects', label: 'Projects' },
    { href: '/now', label: 'Now' },
    { href: '/uses', label: 'Uses' },
    { href: '/contact', label: 'Contact' },
  ],
} as const;

export type SiteConfig = typeof site;
