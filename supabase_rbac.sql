
-- [1단계] 기존 프로필 테이블 삭제 및 재생성 (CASCADE 추가로 삭제 오류 방지)
-- 만약 이미 테이블이 있다면 삭제하고 다시 만듭니다.
DROP TABLE IF EXISTS public.profiles;

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- [2단계] RLS 보안 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profiles." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- [3단계] 회원가입 시 프로필 자동 생성 함수 및 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거가 이미 있으면 삭제 후 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- [4단계] 중요: 현재 사용자의 이메일 인증 강제 완료 (이메일 안올 때 사용)
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    last_sign_in_at = NOW()
WHERE email = 'yongwoo8529@gmail.com';

-- [5단계] 중요: 본인 계정에 관리자 권한 부여 및 프로필 생성 확인
-- (기존에 가입했더라도 profiles 테이블에 없을 수 있으므로 INSERT를 시도합니다.)
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'yongwoo8529@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
