-- 1. 프로필 테이블 생성 (auth.users와 연결)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 2. RLS(Row Level Security) 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. 정책 설정
CREATE POLICY "프로필은 누구나 조회 가능" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "자신의 프로필만 수정 가능" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 4. 회원가입 시 프로필 자동 생성 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 회원가입 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- [중요] 자신에게 관리자 권한을 수동으로 부여하는 명령어 (가입 후 실행 필요)
-- UPDATE public.profiles SET role = 'admin' WHERE email = '당신의_이메일';
